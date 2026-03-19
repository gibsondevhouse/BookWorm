# Appendix F: Deployment Matrix

| Environment   | Purpose                                  | Characteristics                                    |
|---------------|------------------------------------------|----------------------------------------------------|
| Local Dev     | Developer workstation                    | Runs directly on the host with debug settings. Uses seeded data and permissive CORS. No monitoring. |
| Staging       | Pre‑production testing                   | Mirrors production environment with less traffic. Uses production‑like database and search size. Enables monitoring and backups. |
| Production    | Public self‑hosted deployment            | Hardened configuration, environment variables loaded from secrets store, HTTPS termination via reverse proxy, monitoring and alerts enabled. |
| Testing       | Dedicated environment for automated tests| Provisioned as part of CI/CD. Database resets between runs, seeded data, parallelizable. |

## Deployment Steps

1. **Prepare environment:** Choose a host that can run Node.js and the required backing services. Configure environment variables (.env). Ensure ports are open.
2. **Prepare release artifacts:** Build the application packages and place runtime dependencies under the expected directories.
3. **Run migrations:** Execute database migration scripts to create or update schema.
4. **Initial seed:** Seed the database with an Admin user and minimal content.
5. **Start services:** Start the web and API processes, then verify that database and search services are accessible.
6. **Check health:** Access the `/health` endpoint for each service. Ensure logs show no errors.
7. **Configure backups:** Schedule cron jobs for database dumps, search snapshots and object storage backups. Store backups securely.
8. **Monitor:** Attach monitoring services and dashboards. Configure alerts for downtime and resource thresholds.
