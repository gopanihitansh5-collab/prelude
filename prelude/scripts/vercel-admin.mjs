// Vercel project administration, driven by the REST API.
//
//   VERCEL_TOKEN=... node scripts/vercel-admin.mjs show
//   VERCEL_TOKEN=... node scripts/vercel-admin.mjs fix-root
//   VERCEL_TOKEN=... node scripts/vercel-admin.mjs deployments
//
// It exists because this repo keeps the Next app in `prelude/` while the Vercel
// project was created at the repo root, so every git-triggered build failed with
// "Couldn't find any pages or app directory". That is a project setting, not a
// code problem, so it is fixed here once and stays fixed.

const TEAM = process.env.VERCEL_TEAM ?? 'team_FqluakEFPArTueOmE25QFS4R'
const PROJECT = process.env.VERCEL_PROJECT ?? 'prj_8OnFyYykisFu9IFYEX3K1wWBpWJ3'
const TOKEN = process.env.VERCEL_TOKEN
const ROOT_DIRECTORY = 'prelude'

if (!TOKEN) {
  console.error('VERCEL_TOKEN is not set')
  process.exit(2)
}

async function api(path, init = {}) {
  const url = `https://api.vercel.com${path}${path.includes('?') ? '&' : '?'}teamId=${TEAM}`
  const res = await fetch(url, {
    ...init,
    headers: {
      authorization: `Bearer ${TOKEN}`,
      'content-type': 'application/json',
      ...(init.headers ?? {}),
    },
  })
  const text = await res.text()
  let body
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    body = text
  }
  if (!res.ok) {
    throw new Error(`${init.method ?? 'GET'} ${path} → ${res.status} ${text.slice(0, 400)}`)
  }
  return body
}

function summarise(project) {
  const fields = [
    'id',
    'name',
    'framework',
    'rootDirectory',
    'buildCommand',
    'installCommand',
    'outputDirectory',
    'devCommand',
  ]
  for (const key of fields) {
    console.log(`  ${key.padEnd(16)} ${project?.[key] ?? '(unset)'}`)
  }
  const git = project?.link
  if (git) {
    console.log(`  ${'git'.padEnd(16)} ${git.type} ${git.org}/${git.repo} (repoId ${git.repoId})`)
  }
  const latest = project?.latestDeployments?.[0]
  if (latest) {
    console.log(
      `  ${'latest'.padEnd(16)} ${latest.readyState ?? latest.state} ${latest.url ?? ''} ${
        latest.meta?.githubCommitRef ?? ''
      }`,
    )
  }
}

const command = process.argv[2] ?? 'show'

if (command === 'show') {
  const project = await api(`/v9/projects/${PROJECT}`)
  console.log(`${project.name} (${project.id})`)
  summarise(project)
} else if (command === 'fix-root') {
  const before = await api(`/v9/projects/${PROJECT}`)
  console.log('before:')
  summarise(before)

  // rootDirectory moves the build into prelude/. The build/install commands are
  // cleared so Vercel's Next.js detection chooses them inside that directory —
  // a stale "npm run vercel-build" cannot resolve there, because prelude's
  // package.json has a plain `build` script.
  const patched = await api(`/v9/projects/${PROJECT}`, {
    method: 'PATCH',
    body: JSON.stringify({
      rootDirectory: ROOT_DIRECTORY,
      framework: 'nextjs',
      buildCommand: null,
      installCommand: null,
      outputDirectory: null,
    }),
  })

  console.log('\nafter:')
  summarise(patched)
  if (patched.rootDirectory !== ROOT_DIRECTORY) {
    console.error(`\nFAILED: rootDirectory is ${patched.rootDirectory}`)
    process.exit(1)
  }
  console.log(`\nrootDirectory = ${patched.rootDirectory}`)
} else if (command === 'deployments') {
  const list = await api(`/v6/deployments?projectId=${PROJECT}&limit=5`)
  for (const d of list.deployments ?? []) {
    console.log(
      `${d.state.padEnd(10)} ${new Date(d.createdAt).toISOString()} ${d.url} ${
        d.meta?.githubCommitRef ?? ''
      } ${d.meta?.githubCommitMessage?.slice(0, 60) ?? ''}`,
    )
  }
} else {
  console.error(`unknown command: ${command}`)
  process.exit(2)
}
