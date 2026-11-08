# Deploy UltragenGine3D to Vercel

This deploys the **React + Vite browser editor**. The FastAPI service and AI worker are separate processes and are not deployed by this Vercel configuration.

## 1. Import the GitHub repository

1. Sign in to [Vercel](https://vercel.com/).
2. Select **Add New → Project**.
3. Import `UltraSonic-Technologies/UltragenGine3D`.
4. Keep the repository root as the Root Directory.
5. Vercel should detect Vite. The repository's `vercel.json` sets the build command to `npm run build` and output directory to `dist`.
6. Deploy.

## 2. Configure the API URL

If you have deployed the FastAPI service separately, open the Vercel project:

1. Go to **Settings → Environment Variables**.
2. Add `VITE_API_BASE_URL`.
3. Set its value to the public HTTPS origin of your API, for example `https://api.example.com` (do not include a trailing slash).
4. Apply it to Production and Preview as appropriate.
5. Redeploy so Vite includes the variable in the frontend build.

Do not set this to `localhost`: visitors' browsers would try to connect to their own computers.

The API must allow browser requests from your Vercel deployment origin through its CORS configuration. Configure `ULTRAGEN_CORS_ORIGINS` on the API host with the exact deployed frontend origin(s).

## 3. Backend and AI worker

Do not deploy the current FastAPI service as a Vercel static frontend or assume its SQLite database and long-running worker will work there. Run the API with persistent storage on a suitable Python host, and run the model worker on a machine with the required model dependencies and GPU capacity.

The API is usable without an inference worker for health checks and job submission, but AI jobs will not complete until a compatible provider is installed and running. TripoSR currently handles image-to-3D only; it is not the retexturing provider.

## 4. Local production build

Use Node.js 26.13.0, matching the repository CI configuration:

```powershell
npm install
npm run typecheck
npm run build
npm run preview
```

Vercel deployment status and the final production URL are shown in the Vercel project dashboard.
