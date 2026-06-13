import { save } from "@tauri-apps/plugin-dialog";
import { api } from "./api";
import { isAndroid } from "./platform";

function defaultBackupName(): string {
  return `health-tracker-backup-${new Date().toISOString().slice(0, 10)}.json`;
}

/** Export full app data to a JSON file chosen by the user (desktop or Android). */
export async function exportBackupToFile(): Promise<boolean> {
  const backup = await api.exportBackup();
  const contents = JSON.stringify(backup, null, 2);

  const path = await save({
    filters: [{ name: "JSON", extensions: ["json"] }],
    defaultPath: defaultBackupName(),
  });

  if (!path) {
    return false;
  }

  try {
    await api.writeBackupFile(path, contents);
    return true;
  } catch (err) {
    if (isAndroid()) {
      throw new Error(
        `Could not write backup (${String(err)}). Try another folder such as Downloads.`
      );
    }
    throw err;
  }
}
