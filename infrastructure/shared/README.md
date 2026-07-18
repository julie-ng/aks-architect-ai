# Shared Infrastructure

This terraform deploys the **networking and database** shared by the RAG pipeline and the retrieval API: a dedicated VPC and an RDS Postgres instance with `pgvector`.

It is public-only by design — no NAT, no private subnets, no VPC endpoints. All the networking plumbing (VPC, subnets, IGW, route table, security group) is free; the only resource that incurs cost is the RDS instance (and its public IPv4).

## Configuration

For details, see [defaults.auto.tfvars](./defaults.auto.tfvars)

| Setting | Value |
|---|---|
| Region | eu-west-1 |
| Name prefix | skai |
| VPC CIDR | 10.0.0.0/24 |
| Public subnets | 10.0.0.0/27, 10.0.0.32/27 (one per AZ) |
| DB ingress | 0.0.0.0/0 on 5432 |
| DB instance identifier | skai-postgres-db |
| DB name / user | skaidb / skai_admin |
| DB instance class | db.t4g.micro |
| DB storage | 20 GB gp3, encrypted |
| DB engine | Postgres 17 |

The master password is **generated** by terraform (`random_password`) and stored in state as a `sensitive` output — read it with `terraform output -raw db_password`.

> [!NOTE]
> **Two public subnets across two AZs** is not for high availability — RDS *requires* a subnet group spanning ≥ 2 AZs, even for a single instance. The DB itself is one instance (not Multi-AZ).

> [!NOTE]
> **The database is reachable from the internet** (`0.0.0.0/0` on 5432) — the password is the control. Callers (a laptop, later Lambda/App Runner) have no static egress IPs to allowlist, so for this POC an open ingress + a strong generated password is the pragmatic trade. Not a production posture.

`pgvector` is enabled via SQL (`CREATE EXTENSION vector` in [./../../db/init.sql](./../../db/init.sql)), not here — see the parent [README](../README.md) for the DB init step.

## Deployment

Init project:

```bash
terraform init
```

Then plan, saving the result so you apply exactly what you reviewed:

```bash
terraform plan -out plan.tfplan
```

If satisfied, run:

```bash
terraform apply plan.tfplan
```

> [!TIP]
> The `-out` flag saves the plan to a file, so `terraform apply plan.tfplan` runs exactly what you just reviewed — no re-plan in between.
