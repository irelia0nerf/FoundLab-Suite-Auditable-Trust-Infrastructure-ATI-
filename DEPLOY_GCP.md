# 🚀 FoundLab Suite - Fast Deploy Instructions (GCP Cloud Run)

These commands will deploy the Client (Frontend) and Server (Backend) to Google Cloud Run.

## Prerequisites
- Google Cloud SDK (`gcloud`) installed and authenticated.
- A GCP Project with Billing enabled.

## 1. Setup Variables
Run this in your terminal (PowerShell):
```powershell
$PROJECT_ID = "foundlab-kyc-prod" # Replace with your GCP Project ID
$REGION = "us-central1"
gcloud config set project $PROJECT_ID
```

## 2. Deploy Client (Frontend)
This deploys the React app as a static container.

```powershell
cd client
gcloud builds submit --tag gcr.io/$PROJECT_ID/foundlab-client
gcloud run deploy foundlab-client `
  --image gcr.io/$PROJECT_ID/foundlab-client `
  --platform managed `
  --region $REGION `
  --allow-unauthenticated `
  --port 8080
```

## 3. Deploy Server (Backend - Optional)
Only needed if you want server-side OCR auditing.

```powershell
cd ../server
gcloud builds submit --tag gcr.io/$PROJECT_ID/foundlab-server
gcloud run deploy foundlab-server `
  --image gcr.io/$PROJECT_ID/foundlab-server `
  --platform managed `
  --region $REGION `
  --allow-unauthenticated `
  --port 8000
```

## 4. Final Configuration
After deployment, take the URL of the `foundlab-server` (e.g., `https://foundlab-server-xyz.a.run.app`) and update the client environment variable if you rebuild.

For now, the client works in **Standalone Mode**, so Step 2 is sufficient for a demo!
