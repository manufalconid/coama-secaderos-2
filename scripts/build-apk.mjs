import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT_DIR = path.resolve(".");
const TABLET_DIR = path.join(ROOT_DIR, "apps/tablet");
const ANDROID_DIR = path.join(TABLET_DIR, "android");
const PACKAGE_JSON_PATH = path.join(TABLET_DIR, "package.json");

function runCommand(command, cwd) {
  console.log(`\n[RUNNING] ${command} (in ${cwd})`);
  execSync(command, { stdio: "inherit", cwd });
}

try {
  // 1. Read package version
  console.log("Reading tablet application version...");
  const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, "utf8"));
  const version = pkg.version || "unknown";
  console.log(`Target Version: v${version}`);

  // 2. Build React Web Assets
  console.log("\n--- Step 1: Compiling React App assets ---");
  runCommand("npm run build", TABLET_DIR);

  // 3. Sync Capacitor
  console.log("\n--- Step 2: Syncing Capacitor ---");
  runCommand("npx cap sync", TABLET_DIR);

  // 4. Compile APK with Gradle
  console.log("\n--- Step 3: Compiling Android APK with Gradle ---");
  // On Windows, use gradlew.bat
  const isWindows = process.platform === "win32";
  const gradleCmd = isWindows ? "cmd /c gradlew.bat assembleDebug" : "./gradlew assembleDebug";
  runCommand(gradleCmd, ANDROID_DIR);

  // 5. Copy and Version APK
  console.log("\n--- Step 4: Versioning and Copying APK ---");
  const sourceApkPath = path.join(ANDROID_DIR, "app/build/outputs/apk/debug/app-debug.apk");
  const destApkVersionedPath = path.join(ROOT_DIR, `Lumo_Secaderos_Tablet_v${version}.apk`);
  const destApkLatestPath = path.join(ROOT_DIR, "Lumo_Secaderos_Tablet.apk");

  if (fs.existsSync(sourceApkPath)) {
    // Copy to versioned path
    fs.copyFileSync(sourceApkPath, destApkVersionedPath);
    console.log(`[SUCCESS] Copied and versioned APK: Lumo_Secaderos_Tablet_v${version}.apk`);

    // Copy to latest path
    fs.copyFileSync(sourceApkPath, destApkLatestPath);
    console.log(`[SUCCESS] Updated main APK: Lumo_Secaderos_Tablet.apk`);
  } else {
    throw new Error(`Compiled APK not found at: ${sourceApkPath}`);
  }

  console.log("\n===================================================");
  console.log(`  APK COMPILATION COMPLETE FOR VERSION v${version}`);
  console.log("===================================================\n");
} catch (error) {
  console.error("\n[ERROR] Build APK failed:", error.message);
  process.exit(1);
}
