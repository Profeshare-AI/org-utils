const fs = require("fs");

(async () => {
  const { Octokit } = await import("@octokit/rest");

  const token = process.env.GH_TOKEN;
  const org = "Profeshare-AI"; // Replace if needed

  const octokit = new Octokit({ auth: token });

  async function getOrgRepos() {
    const repos = [];
    let page = 1;
    while (true) {
      const { data } = await octokit.repos.listForOrg({
        org,
        type: "all",
        per_page: 100,
        page: page++
      });
      if (data.length === 0) break;
      repos.push(...data.map(repo => repo.name));
    }
    return repos;
  }

  async function syncLabels(repo, labels) {
    for (const label of labels) {
      try {
        await octokit.issues.getLabel({ owner: org, repo, name: label.name });
        await octokit.issues.updateLabel({ owner: org, repo, name: label.name, ...label });
        console.log(`[✓] Updated label: ${label.name} in ${repo}`);
      } catch (e) {
        await octokit.issues.createLabel({ owner: org, repo, ...label }).catch(() => {});
        console.log(`[+] Created label: ${label.name} in ${repo}`);
      }
    }
  }

  async function syncMilestones(repo, milestones) {
    const existing = await octokit.issues.listMilestones({ owner: org, repo });
    const titles = existing.data.map(m => m.title);

    for (const milestone of milestones) {
      if (!titles.includes(milestone.title)) {
        await octokit.issues.createMilestone({
          owner: org,
          repo,
          ...milestone
        }).then(() => {
          console.log(`[+] Created milestone: ${milestone.title} in ${repo}`);
        }).catch(() => {});
      }
    }
  }

  const repos = await getOrgRepos();
  console.log(`Discovered ${repos.length} repositories:`, repos);
  const labels = JSON.parse(fs.readFileSync("labels.json"));
  const milestones = JSON.parse(fs.readFileSync("milestones.json"));

  for (const repo of repos) {
    console.log(`\n🔄 Syncing ${repo}`);
    await syncLabels(repo, labels);
    await syncMilestones(repo, milestones);
  }

  console.log("\n✅ Sync complete.");
})();
