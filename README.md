# HTML / CSS Entity Escaper

**Student:** Sanjay V
**Roll No:** 24105134
**Department:** CSE

A small browser-based tool that escapes and unescapes HTML special
characters (`< > & " '`), built as the vehicle for a complete, working
DevOps pipeline: **GitHub → Jenkins → Docker → Container Registry →
Terraform → Ansible → Kubernetes → Production**.

---

## 1. Problem & solution

Developers constantly need to know exactly how a string will be
represented once it's placed inside HTML — is that `&` going to break
the markup? Does the browser need `&quot;` or is a plain `"` fine? This
tool takes raw text/markup, shows the escaped and unescaped versions
side by side, and includes a reference table of the most important
entities, so the transformation is never a guess.

More importantly for this project, it's simple enough that 100% of the
engineering effort goes toward **operating** it properly: automated
tests, containerization, infrastructure as code, configuration
management, and a self-healing, rolling-update Kubernetes deployment,
all wired together by CI/CD.

---

## 2. Live architecture

```
Developer
   │  git push (feature branch)
   ▼
GitHub  ──── Pull Request ────►  develop / main
   │
   │ webhook (push / PR merged)
   ▼
Jenkins
   │
   ├─ Checkout
   ├─ Validate project structure
   ├─ Test            (node tests/test.js)
   ├─ Docker Build     (docker/Dockerfile → nginx:alpine image)
   ├─ Docker Login/Push (to GHCR/Docker Hub, via Jenkins credentials)
   ├─ Terraform Check   (init/validate/plan only — apply is manual)
   ├─ Ansible Configure (optional, provisions the k3s host)
   └─ Deploy to Kubernetes
        │
        ▼
   kubectl apply -f kubernetes/
        │
        ▼
   Internet → Ingress → Service (ClusterIP) → Pod 1 / Pod 2 (nginx)
```

---

## 3. Project structure

```
html-css-entity-escaper/
├── app/                    # the actual web app (HTML/CSS/JS, no build step)
│   ├── index.html
│   ├── style.css
│   └── script.js
├── tests/
│   └── test.js             # dependency-free Node test runner
├── docker/
│   ├── Dockerfile
│   └── nginx.conf          # adds a /health endpoint
├── jenkins/
│   └── Jenkinsfile         # copy of the root Jenkinsfile, per spec
├── Jenkinsfile             # the pipeline Jenkins actually runs
├── terraform/
│   ├── providers.tf
│   ├── main.tf              # VPC + Option A (EKS) + Option B (EC2/k3s)
│   ├── variables.tf
│   ├── outputs.tf
│   └── terraform.tfvars.example
├── ansible/
│   ├── inventory.ini.example
│   ├── playbook.yml
│   └── roles/
│       ├── common/          # apt update/upgrade, base packages
│       ├── docker/          # installs Docker engine
│       └── k3s/             # installs lightweight Kubernetes
├── kubernetes/
│   ├── namespace.yaml
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── ingress.yaml
│   └── configmap.yaml
├── scripts/
│   ├── build.sh
│   ├── test.sh
│   └── deploy.sh
├── .gitignore
├── .dockerignore
└── README.md
```

---

## 4. Running the app locally (no Docker)

Just open `app/index.html` in a browser — it's a static page with no
dependencies.

## 5. Running the tests

```bash
node tests/test.js
# or
./scripts/test.sh
```

Tests import the exact `escapeHtml` / `unescapeHtml` functions used by
the page (`app/script.js`), so there is no logic duplication between
the app and its tests.

---

## 6. Docker

```bash
# Build
docker build -f docker/Dockerfile -t html-css-entity-escaper:local .
# or: ./scripts/build.sh

# Run
docker run -d -p 8080:80 --name entity-escaper html-css-entity-escaper:local

# Check it's up
curl http://localhost:8080/health      # -> ok
docker ps

# Stop
docker stop entity-escaper && docker rm entity-escaper
```

The image is `nginx:1.27-alpine` serving the static files in `app/`,
with a `/health` endpoint used by both `docker HEALTHCHECK` and the
Kubernetes probes.

---

## 7. Container registry

The pipeline pushes to **GitHub Container Registry (GHCR)** by default
(swap for Docker Hub by changing `REGISTRY` in the `Jenkinsfile` — no
other change needed).

Placeholders used everywhere instead of real values:

- `REGISTRY_USERNAME`
- `IMAGE_NAME` → `html-css-entity-escaper`

Real credentials are **never** written in any file — see [Section 11:
Security](#11-security).

---

## 8. Jenkins CI/CD

### 8.1 Required plugins
- Git
- Docker Pipeline
- Credentials Binding
- Pipeline: Stage View
- (Kubernetes CLI Plugin, or just call `kubectl` from an agent that has it installed)

### 8.2 Required credentials (Manage Jenkins → Credentials)

| Credential ID                | Type                | Used for                          |
|-------------------------------|---------------------|------------------------------------|
| `REGISTRY_CREDENTIALS_ID`     | Username/password   | Docker login + push                |
| `KUBECONFIG_CREDENTIALS_ID`   | Secret file          | `kubectl apply` / rollout status   |
| `AWS_CREDENTIALS_ID`          | Username/password   | Terraform plan (only if that stage runs) |

### 8.3 GitHub webhook

Repo → Settings → Webhooks → Add webhook:
- Payload URL: `http://<your-jenkins-host>/github-webhook/`
- Content type: `application/json`
- Events: **push**, **pull request**

### 8.4 Pipeline job

Create a **Pipeline** job in Jenkins → "Pipeline script from SCM" → point it
at this repository → script path `Jenkinsfile`. Enable "GitHub hook trigger
for GITScm polling" under Build Triggers.

### 8.5 Stages (see `Jenkinsfile`)

`Checkout → Validate → Test → Docker Build → Docker Login & Push →
Terraform Check (optional) → Ansible Configure (optional) → Deploy to
Kubernetes → Health Verification`

---

## 9. Git branching strategy

```
feature/entity-escaper   →   develop   →   main
```

- `main` — production-ready, protected, deploys automatically.
- `develop` — integration branch, protected, where feature branches merge first.
- `feature/*` — one branch per unit of work (e.g. `feature/entity-escaper`,
  `feature/dark-mode`).

**Recommended branch protection (GitHub → Settings → Branches):**
- Require a pull request before merging into `main` and `develop`.
- Require status checks (the Jenkins build) to pass before merging.
- Require at least 1 review approval.
- Disallow force-pushes to `main`/`develop`.

**Pull request workflow:**
1. `git checkout -b feature/entity-escaper develop`
2. Make changes, commit with meaningful messages (see below), push.
3. Open a PR into `develop`. Jenkins runs Test + Docker Build automatically.
4. After review + green build, merge into `develop`.
5. Periodically, open a PR from `develop` into `main` to release.

**Meaningful commit examples:**
```
feat(app): add copy-to-clipboard button
fix(script): correct double-escaping of ampersands
chore(docker): switch base image to nginx:1.27-alpine
docs(readme): document Terraform two-option strategy
ci(jenkins): add health verification stage
```

---

## 10. Terraform

Two provisioning approaches are provided in `terraform/main.tf`,
switched by the `deployment_mode` variable:

| Mode           | What it creates                                   | Cost                | Recommended for |
|----------------|----------------------------------------------------|----------------------|------------------|
| `"student"` (Option B) | VPC + 1 EC2 instance running **k3s** (lightweight Kubernetes) | Low — fits free tier | **This project / demos / viva** |
| `"production"` (Option A) | VPC + full managed **AWS EKS** cluster + node group | High — control plane + nodes bill continuously | Realistic prod architecture only, if budget allows |

These are genuinely different architectures, not two labels on the same
thing — Option A gives you a managed control plane and production-grade
scaling; Option B gives you one small VM you fully control, which is
far cheaper and faster to spin up/down for a college project.

### Commands

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars   # fill in real values
terraform init
terraform validate
terraform plan
terraform apply     # creates real AWS resources — review the plan first
# ...when done demoing:
terraform destroy   # tears everything down — run manually, never from CI
```

AWS credentials come from `aws configure` / environment variables / an
IAM role — never from a file in this repo.

---

## 11. Ansible

Configures the EC2 host provisioned by Terraform (Option B):

```bash
cd ansible
cp inventory.ini.example inventory.ini   # fill in the real IP + SSH key
ansible-playbook -i inventory.ini playbook.yml
```

Roles:
- **common** — apt update/upgrade, base utilities, creates `/opt/entity-escaper`.
- **docker** — installs Docker engine, enables the service, adds the SSH user to the `docker` group.
- **k3s** — installs k3s (single-node Kubernetes), waits for the node to be `Ready`, fetches `kubeconfig` locally.

---

## 12. Kubernetes

```bash
kubectl apply -f kubernetes/namespace.yaml
kubectl apply -f kubernetes/configmap.yaml -n entity-escaper
kubectl apply -f kubernetes/deployment.yaml -n entity-escaper
kubectl apply -f kubernetes/service.yaml -n entity-escaper
kubectl apply -f kubernetes/ingress.yaml -n entity-escaper
# or just: ./scripts/deploy.sh

kubectl get pods -n entity-escaper
kubectl get svc -n entity-escaper
kubectl get ingress -n entity-escaper
kubectl describe deployment entity-escaper -n entity-escaper

# scaling
kubectl scale deployment/entity-escaper --replicas=4 -n entity-escaper

# rolling updates & rollback
kubectl rollout status deployment/entity-escaper -n entity-escaper
kubectl rollout history deployment/entity-escaper -n entity-escaper
kubectl rollout undo deployment/entity-escaper -n entity-escaper
```

**Architecture:**
```
Internet → Ingress → Service (ClusterIP) → Pod 1
                                          → Pod 2
```

- **2 replicas**, `RollingUpdate` strategy (`maxUnavailable: 0`, `maxSurge: 1`) — zero-downtime deploys.
- **Resource requests/limits** — prevents one pod starving the node.
- **readinessProbe** (`GET /health`) — a pod only receives traffic once nginx can actually respond; avoids routing to a pod mid-startup.
- **livenessProbe** (`GET /health`) — Kubernetes restarts a pod that stops responding, giving self-healing without manual intervention.

---

## 13. Security — what must NEVER be committed to GitHub

- AWS access keys / secret keys
- Docker Hub / GHCR passwords or tokens
- GitHub personal access tokens
- Jenkins credential values
- `kubeconfig` files (contain cluster access)
- Real `terraform.tfvars` (only the `.example` file is committed)
- Real `ansible/inventory.ini` (only the `.example` file is committed)
- Any `.pem` / `.key` SSH private keys

All of the above are covered by `.gitignore`. Secrets live only in:
Jenkins Credentials, environment variables, AWS IAM roles, or
Kubernetes Secrets (not needed by this stateless app, but the pattern
applies if a backend is added later).

---

## 14. Testing strategy

Frontend-only project → no heavyweight test framework. `tests/test.js`
is a ~90-line dependency-free Node script that imports the app's own
`escapeHtml`/`unescapeHtml` functions and asserts on:
- each special character (`< > & " '`)
- a full HTML snippet
- plain text (no-op)
- empty string
- round-trip (escape → unescape returns the original)

Run with `node tests/test.js` — exits non-zero on failure, so Jenkins'
`Test` stage fails the build automatically if anything breaks.

---

## 15. Health checks

- **Docker `HEALTHCHECK`** hits `http://127.0.0.1/health` inside the container.
- **Kubernetes `readinessProbe` / `livenessProbe`** hit the same `/health` path on port 80.
- nginx returns `200 ok` for `/health`, configured in `docker/nginx.conf` — no backend/database needed since the app is entirely static.

---

## 16. Why these choices

- **nginx:alpine** — smallest practical image for serving static files, well understood, built-in health-check friendliness.
- **AWS** — widest free-tier + documentation coverage for a student project; EC2+k3s keeps costs near zero while EKS remains available as the "how would this look in production" option.
- **k3s over full k3s/kubeadm cluster** — single binary, minutes to install via Ansible, still 100% real Kubernetes (same manifests, same `kubectl` commands).
- **No JS framework** — the app is a form + a transform + a table; React/Angular would add build tooling with no real benefit and would obscure the DevOps pipeline, which is the actual subject of this project.
