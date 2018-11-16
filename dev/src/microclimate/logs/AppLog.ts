import MCLog from "./MCLog";
import Log from "../../Logger";

export default class AppLog extends MCLog {

    private initialized: boolean = false;
    private previousLength: number = 0;

    constructor(
        public readonly projectID: string,
        public readonly projectName: string
    ) {
        super(projectID, projectName,
            `Waiting for Microclimate to send application logs for ${projectName}...`,
            MCLog.LogTypes.APP);

        // update will be invoked when we get a container-logs event
    }

    public async update(contents: string): Promise<void> {
        if (!this.doUpdate) {
            Log.e("Update was invoked on an applog with doUpdate=false, this should never happen!");
        }

        if (!this.initialized) {
            this.initialized = true;
            this.outputChannel.clear();
        }

        let newContents;
        const diff = contents.length - this.previousLength;
        if (diff === 0) {
            // no new output
            return;
        }
        else if (diff < 0) {
            // the log was cleared, eg due to container restart
            this.outputChannel.clear();
            newContents = contents;
        }
        else {
            // get only the new output
            newContents = contents.substring(this.previousLength, contents.length);
        }

        this.outputChannel.append(newContents);
        this.previousLength = contents.length;
    }
}
