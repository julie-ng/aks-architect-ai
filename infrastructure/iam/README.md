# Identity and Access Management

This terraform manages the roles and permissions of the various AWS principals and resources. **It does NOT deploy any resources _that incur costs._**

Because they are **defined by reference** to the resource names, e.g. ARNs, these terraform scripts can be run before other resources are deployed.

## Configuration

> [!WARNING]
> Documentation below refers to this app's naming. Because S3 bucket names are global, if you choose to deploy this project, you need to [configure](./defaults.auto.tfvars) a name other than `skai-pipeline-store`.

For details, see [defaults.auto.tfvars](./defaults.auto.tfvars)

| Setting | Value |
|---|---|
| Region | eu-west-1 |
| Name prefix | skai |
| Pipeline S3 bucket name | skai-pipeline-store |
| Titan model ARN | `arn:aws:bedrock:eu-west-1::foundation-model/amazon.titan-embed-text-v2:0` |
| Nova model ARN | `arn:aws:bedrock:eu-west-1::foundation-model/amazon.nova-micro-v1:0` |
| Crawlee function role name | skai-crawlee-fn-role |
| Chunking function role name | skai-chunking-fn-role |
| Embed function role name | skai-embed-fn-role |
| Retrieval API role name | skai-retrieval-api-role |

> [!NOTE]
> The function roles were _by design_ for when the workflow would be deployed to Lambda.  
>
> However, the **design has changed** after pipeline optimization surfaced bottlenecks at AWS Bedrock (LLMs) and database, which make multiple workers/lambdas and thus multiple roles irrelevant. 
>
> Leaving the IaC as is for accurate point in time documentation of working code. They will be updated later.

## Deployment

Init project:

```bash
terraform init
```

Then run the `plan` command to surface errors and verify the resources to be created/adjusted:

```bash
terraform plan -out plan.tfplan
```

If satisfied, run

```bash
terraform apply plan.tfplan
```

> [!TIP]
> The `-out` flag saves the plan to a file, so `terraform apply plan.tfplan` runs **exactly** what you just reviewed.
