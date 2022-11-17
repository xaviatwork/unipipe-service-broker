import { Command } from "../deps.ts";
import { Repository } from "../repository.ts";

interface GitOpts {
  name?: string;
  email?: string;
  message?: string;
}

export function registerGitCmd(program: Command) {
  program
    .command("git <cmd> [repo]")
    .description("Runs Git to simplify pull/push commands")
    .action(async (opts: GitOpts, cmd: string, repo: string | undefined) => {

      const repository = new Repository(repo ? repo : ".");

      switch (cmd) {
        case "pull":
          await commandPull(repository);
          break;
        case "push":
          await commandPush(repository, opts);
          break;
        default:
          console.log(`Git command '${cmd}' is not found`);
      }
    });
}

export async function commandPull(repo: Repository) {
  const pullFastForward = await gitPullFastForward(repo.path);

  if (!pullFastForward) {
    await gitPullRebase(repo.path);
  }
}

export async function commandPush(repo: Repository, opts: GitOpts) {
  const name = opts.name || "Uncoipipe CLI";
  const email = opts.email || "unipipe-cli@meshcloud.io";
  const message = opts.message || "Commit changes";
  
  const add = await gitAdd(repo.path);
  if (!add) return;

  const hasChanges = await gitDiffIndex(repo.path);

  if (!hasChanges) {
    const commit = await gitCommit(repo.path, name, email, message);
    if (!commit) return;
  }

  const push = await gitPush(repo.path);
  if (!push) {
    await commandPull(repo);
    await gitPush(repo.path);
  }
}

async function gitPullFastForward(repoPath: string): Promise<boolean> {
  return await executeGit(repoPath, ["pull", "--ff-only"]);
}

async function gitPullRebase(repoPath: string): Promise<boolean> {
  return await executeGit(repoPath, ["pull", "--rebase"]);
}

async function gitPush(repoPath: string): Promise<boolean> {
  return await executeGit(repoPath, ["push"]);
}

async function gitAdd(repoPath: string): Promise<boolean> {
  return await executeGit(repoPath, ["add", "."]);
}

async function gitDiffIndex(repoPath: string): Promise<boolean> {
  return await executeGit(repoPath, ["diff-index", "--quiet", "HEAD"]);
}

async function gitCommit(repoPath: string, name: string, email: string, message: string): Promise<boolean> {
  return await executeGit(repoPath, [
    "commit", "-a", "-m", `Unipipe CLI: ${message}`, "--author", `${name} <${email}>`]);
}

async function executeGit(dir: string, args: string[]): Promise<boolean> {
  const cmd = ["git", ...args];

  console.log(`Running ${cmd.join(' ')}`);

  const process = Deno.run({
    cmd: cmd,
    cwd: dir
  });

  const status = await process.status();
  console.log(status.success ? "Command succeeded" : "Command failed");

  return status.success;
}
