import path from 'path'
import fs from 'fs'
import { execSync } from 'child_process'
import chalk from 'chalk'
import * as dotenv from 'dotenv'
import { Octokit } from '@octokit/core'
import { paginateRest } from '@octokit/plugin-paginate-rest'
import { restEndpointMethods } from '@octokit/plugin-rest-endpoint-methods'
import { schedule } from 'node-cron'

const { error, log } = console
dotenv.config()

if (!process.env.GITHUB_TOKEN) {
  error(chalk.red('Environment variable `GITHUB_TOKEN` is required!'))
  process.exit()
}

const MyOctokit = Octokit.plugin(paginateRest, restEndpointMethods)
const octokit = new MyOctokit({ auth: process.env.GITHUB_TOKEN })
const backupDirectory = '../backups'

function isBackupUpToDate(existingBackups, latestDate) {
  return Object.keys(existingBackups).some((existingBackup) =>
    existingBackup.includes(`${latestDate}`)
  )
}

function getExistingBackups(backupPath) {
  const files = fs.readdirSync(backupPath)
  const stats = files
    .filter((x) => x.endsWith('.zip'))
    .reduce(
      (total, current) => ({
        ...total,
        [current]: {
          date: parseInt(current.split('-').at(-1).replace('.zip', '')),
        },
      }),
      {}
    )

  return stats
}

function cleanBackups(backupPath, existingBackups) {
  if (
    Object.keys(existingBackups).length + 1 <=
    parseInt(process.env.MAX_BACKUPS)
  )
    return

  const backupsAscending = Object.keys(existingBackups).map((key) => ({
    name: key,
    zip: existingBackups[key],
  }))
  backupsAscending.sort((a, b) => a.zip.date - b.zip.date)
  log(chalk.yellow(`✂️  Pruning backups in ${backupPath}`))

  const prunePath = path.join(backupPath, backupsAscending[0].name)
  fs.unlinkSync(prunePath)
  log(chalk.green(`✂️  Pruned ${prunePath}`))
}

function zipRepository(repository) {
  const { clone_url, full_name, pushed_at } = repository

  const backupPath = path.join(backupDirectory, full_name)
  const cloneRepoPath = path.join(backupDirectory, full_name, 'cloned')

  const latestDate = Date.parse(pushed_at)
  const backupName = `${full_name.split('/')[1]}-${latestDate}.zip`

  fs.rmSync(cloneRepoPath, { recursive: true, force: true }) // Clean up any previous clones
  fs.mkdirSync(backupPath, { recursive: true })

  const existingBackups = getExistingBackups(backupPath)
  if (isBackupUpToDate(existingBackups, latestDate)) {
    log(
      chalk.green(
        `✅  Repository ${full_name} backup is up-to-date. Skipping zip step.`
      )
    )
    return
  }

  fs.mkdirSync(cloneRepoPath, { recursive: true })

  try {
    log(chalk.blue(`⬇️  Cloning ${full_name}`))

    const url = clone_url.replace('//', `//${process.env.GITHUB_TOKEN}@`)

    execSync(`git clone --mirror ${url} .`, {
      cwd: cloneRepoPath,
      stdio: 'pipe',
    })
    execSync(`zip ${backupName} *`, {
      cwd: cloneRepoPath,
    })

    log(chalk.blue(`✅  Cloned ${full_name}`))

    fs.renameSync(
      path.join(cloneRepoPath, backupName),
      path.join(backupPath, backupName)
    )
    fs.rmSync(cloneRepoPath, {
      recursive: true,
      force: true,
      maxRetries: 10,
    })

    cleanBackups(backupPath, existingBackups)
  } catch (e) {
    error(chalk.red(e))
  }
}

function processRepositories(repositories) {
  log(`Creating a backup of ${repos.length} repositories`)

  for (const repository of repositories) {
    zipRepository(repository)
  }
}

const user = (await octokit.rest.users.getAuthenticated()).data.login
const repoOwners = [user]

if (process.env.ORGANISATIONS) {
  repoOwners.push(...process.env.ORGANISATIONS.split(','))
}

const repos = (
  await octokit.paginate(octokit.rest.repos.listForAuthenticatedUser, {
    affiliation: process.env.AFFILIATION,
    per_page: 100,
  })
).filter((repo) => repoOwners.includes(repo.owner.login))

if (process.env.SCHEDULE) {
  schedule(process.env.SCHEDULE, () => {
    processRepositories(repos)
  })

  log(chalk.green(`🚀  Scheduled backup for ${process.env.SCHEDULE}`))
}

log(chalk.green(`⏩  Running backup once on start`))
processRepositories(repos)
