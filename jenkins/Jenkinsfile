// HTML / CSS Entity Escaper — CI/CD pipeline
//
// Flow:
//   GitHub webhook -> Checkout -> Validate -> Test -> Docker Build
//   -> Docker Push -> (Terraform check) -> (Ansible config) -> K8s Deploy
//
// All secrets come from Jenkins Credentials — nothing here is hard-coded.
// Required credentials (configure in Jenkins > Manage Credentials):
//   REGISTRY_CREDENTIALS_ID   - username/password (or token) for the registry
//   KUBECONFIG_CREDENTIALS_ID - "Secret file" credential holding kubeconfig
//   AWS_CREDENTIALS_ID        - AWS access key/secret, only if Terraform stage runs
//
// Required Jenkins plugins:
//   Docker Pipeline, Git, Credentials Binding, Pipeline: Stage View,
//   Kubernetes CLI Plugin (or plain sh + kubectl on the agent)

pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '20'))
    }

    environment {
        REGISTRY        = 'ghcr.io'                       // or docker.io
        REGISTRY_OWNER  = 'sanjayvsanjayv'              // placeholder — set via Jenkins env or param
        IMAGE_NAME      = 'html-css-entity-escaper'
        IMAGE_TAG       = "${env.BUILD_NUMBER}"
        FULL_IMAGE      = "${REGISTRY}/${REGISTRY_OWNER}/${IMAGE_NAME}:${IMAGE_TAG}"
        LATEST_IMAGE    = "${REGISTRY}/${REGISTRY_OWNER}/${IMAGE_NAME}:latest"
        K8S_NAMESPACE   = 'entity-escaper'
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Validate') {
            steps {
                sh '''
                    echo "Validating project structure..."
                    test -f app/index.html
                    test -f app/style.css
                    test -f app/script.js
                    test -f docker/Dockerfile
                    echo "OK"
                '''
            }
        }

        stage('Test') {
            steps {
                sh 'node tests/test.js'
            }
        }

        stage('Docker Build') {
            steps {
                sh """
                    docker build -f docker/Dockerfile -t ${FULL_IMAGE} -t ${LATEST_IMAGE} .
                """
            }
        }

        stage('Docker Login & Push') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'REGISTRY_CREDENTIALS_ID',
                    usernameVariable: 'REG_USER',
                    passwordVariable: 'REG_PASS'
                )]) {
                    sh '''
                        echo "$REG_PASS" | docker login "$REGISTRY" -u "$REG_USER" --password-stdin
                        docker push "$FULL_IMAGE"
                        docker push "$LATEST_IMAGE"
                        docker logout "$REGISTRY"
                    '''
                }
            }
        }

        stage('Terraform Check') {
            when { expression { return params.RUN_TERRAFORM == true } }
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'AWS_CREDENTIALS_ID',
                    usernameVariable: 'AWS_ACCESS_KEY_ID',
                    passwordVariable: 'AWS_SECRET_ACCESS_KEY'
                )]) {
                    dir('terraform') {
                        sh '''
                            terraform init -input=false
                            terraform validate
                            terraform plan -input=false -out=tfplan
                            # NOTE: "terraform apply" is intentionally NOT run
                            # automatically here. Infra changes are reviewed
                            # and applied manually (see README > Terraform).
                        '''
                    }
                }
            }
        }

        stage('Ansible Configure') {
            when { expression { return params.RUN_ANSIBLE == true } }
            steps {
                dir('ansible') {
                    sh '''
                        ansible-playbook -i inventory.ini playbook.yml
                    '''
                }
            }
        }

        stage('Deploy to Kubernetes') {
            steps {
                withCredentials([file(credentialsId: 'KUBECONFIG_CREDENTIALS_ID', variable: 'KUBECONFIG')]) {
                    sh '''
                        kubectl apply -f kubernetes/namespace.yaml
                        kubectl apply -f kubernetes/configmap.yaml -n ${K8S_NAMESPACE}
                        kubectl set image deployment/entity-escaper entity-escaper=${FULL_IMAGE} -n ${K8S_NAMESPACE} --record || \
                        kubectl apply -f kubernetes/deployment.yaml -n ${K8S_NAMESPACE}
                        kubectl apply -f kubernetes/service.yaml -n ${K8S_NAMESPACE}
                        kubectl apply -f kubernetes/ingress.yaml -n ${K8S_NAMESPACE}
                        kubectl rollout status deployment/entity-escaper -n ${K8S_NAMESPACE} --timeout=120s
                    '''
                }
            }
        }

        stage('Health Verification') {
            steps {
                withCredentials([file(credentialsId: 'KUBECONFIG_CREDENTIALS_ID', variable: 'KUBECONFIG')]) {
                    sh '''
                        kubectl get pods -n ${K8S_NAMESPACE} -l app=entity-escaper
                        kubectl get svc -n ${K8S_NAMESPACE}
                    '''
                }
            }
        }
    }

    post {
        success {
            echo "Pipeline succeeded: ${FULL_IMAGE} deployed to namespace ${K8S_NAMESPACE}."
        }
        failure {
            echo "Pipeline failed — check the stage logs above."
        }
        always {
            sh 'docker image prune -f || true'
        }
    }
}
