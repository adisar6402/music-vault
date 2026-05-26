const { execSync } = require("child_process");

function run(cmd) {
  console.log(`Running: ${cmd}`);
  execSync(cmd, { stdio: "inherit" });
}

function main() {
  console.log("🚀 Building Music Vault (Render Safe Mode)");

  // Clean old build
  run("rm -rf dist || true");

  // Expo web export (THIS IS THE ONLY REAL BUILD STEP)
  run("npx expo export --platform web");

  console.log("✅ Build complete: dist folder ready");
}

main();