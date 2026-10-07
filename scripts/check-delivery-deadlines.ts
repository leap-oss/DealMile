import { recordDeliveryReminders } from "../lib/delivery/service";
import { db } from "../lib/db";
async function main() {
  try {
    console.log(
      JSON.stringify({ remindersRecorded: await recordDeliveryReminders() }),
    );
  } finally {
    await db().$disconnect();
  }
}
main().catch(() => {
  console.error(
    "Unable to record delivery reminders. Check the server and database configuration.",
  );
  process.exitCode = 1;
});
