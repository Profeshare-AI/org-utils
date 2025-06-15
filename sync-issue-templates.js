
const fs = require("fs");
const path = require("path");

(async () => {
  const { Octokit } = await import("@octokit/rest");
  const token = process.env.GH_TOKEN;
  const org = "Profeshare-AI";
  const octokit = new Octokit({ auth: token });

  async function getRepos() {
    const repos = await octokit.paginate(octokit.rest.repos.listForOrg, {
      org,
      type: "all",
      per_page: 100,
    });
    return repos.map((repo) => repo.name);
  }

  async function syncIssueTemplates(repoName) {
    const issueTemplateDir = path.join(".github", "ISSUE_TEMPLATE");
    const files = fs.readdirSync(issueTemplateDir);

    for (const file of files) {
      const filePath = path.join(issueTemplateDir, file);
      const content = fs.readFileSync(filePath, "utf8");
      const encodedContent = Buffer.from(content).toString("base64");

      const targetPath = `.github/ISSUE_TEMPLATE/${file}`;

      try {
        const { data: existing } = await octokit.repos.getContent({
          owner: org,
          repo: repoName,
          path: targetPath,
        });

        await octokit.repos.createOrUpdateFileContents({
          owner: org,
          repo: repoName,
          path: targetPath,
          message: `chore: sync issue template ${file}`,
          content: encodedContent,
          sha: existing.sha,
        });
      } catch (error) {
        if (error.status === 404) {
          await octokit.repos.createOrUpdateFileContents({
            owner: org,
            repo: repoName,
            path: targetPath,
            message: `chore: add issue template ${file}`,
            content: encodedContent,
          });
        } else {
          console.error(`Error syncing ${file} to ${repoName}:`, error);
        }
      }
    }
  }

  const repos = await getRepos();
  for (const repo of repos) {
    console.log(`Syncing issue templates to ${repo}`);
    await syncIssueTemplates(repo);
  }
})();
