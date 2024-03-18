## Overview
This script will clone and zip the entire history of all of your GitHub repositories. Only repositories that have changed since the last backup will be cloned.

## Instructions
1. **Clone this Repository**
   
2. **Install the dependencies**
    ```bash
    yarn install
    ```

3. **Build a Docker image**
    ```bash
    yarn docker-build
    ```

4. **Set up the Environment Variables**
   
   Copy `.env.example` to `.env` and fill in the appropriate [configuration variables](#configuration-variables).

5. **Create a Docker container**
    ```bash
    yarn docker-run
    ```
   
## Configuration Variables
The script operates with several configurable variables. The following variables are available:

- **GITHUB_TOKEN** (Required)

  Your Personal [GitHub access token](https://github.com/settings/tokens).

- **MAX_BACKUPS** 
  
  The maximum number of unique backups to retain before replacing the oldest. (Default = 3)

- **ORGANISATIONS**
  
  A comma-separated list of organization names to include in the backup. (Requires sufficient permissions)

- **AFFILIATION**
  
  A comma-separated list specifying the types of repositories to include in the backup. (Default = owner,collaborator,organization_member) 

  - Possible Types:
  
    | Type                | Description                                                                                         |
    | ------------------- | --------------------------------------------------------------------------------------------------- |
    | owner               | Repositories owned by the authenticated user.                                                       |
    | collaborator        | Repositories where the user is added as a collaborator.                                             |
    | organization_member | Repositories accessible to the user as a member of an organization. Includes all team repositories. |

- **SCHEDULE**
  
  The cron schedule for executing the backup jobs, see [node-cron](https://github.com/node-cron/node-cron?tab=readme-ov-file#cron-syntax) for more information. To disable scheduled backups, leave this variable empty. (Default = '0 1 * * *'' -> Every day at 01:00)

  ```
   ┌───────────── second (optional)
   │ ┌─────────── minute
   │ │ ┌───────── hour
   │ │ │ ┌─────── day of month
   │ │ │ │ ┌───── month
   │ │ │ │ │ ┌─── day of week
   │ │ │ │ │ │
   * * * * * *
  ```

## Backup Location
If ran successfully, all repositories accessible with the provided token will be cloned and archived in `/backups`. You can access these backups by mounting a local folder.

## Acknowledgments
- This project is based on [GitHub Backup](https://github.com/firebelley/github-backup) by Firebelley.