import { CronJob } from "cron";
import User from '../models/User.js'

const clearAllStories = new CronJob(
    '0 0 * * *',
    async () => {
        try {
            const clearAllStories = await User.updateMany({}, { $set: { stories: [] } });
            console.log("Clearing stories");
        } catch (e) {
            console.log(e);
        }
    }
);

export default clearAllStories;