import { BuildParameters } from '..';
import { getUnityChangeset } from 'unity-changeset';
import { exec } from '@actions/exec';
import fs from 'fs';

class SetupMac {
  static unityHubPath = `"/Applications/Unity Hub.app/Contents/MacOS/Unity Hub"`;

  public static async setup(buildParameters: BuildParameters, actionFolder: string) {
    const unityEditorPath = `/Applications/Unity/Hub/Editor/${buildParameters.editorVersion}/Unity.app/Contents/MacOS/Unity`;

    // Only install unity if the editor doesn't already exist
    if (!fs.existsSync(unityEditorPath)) {
      await SetupMac.installUnityHub();
      await SetupMac.installUnity(buildParameters);
    }

    await SetupMac.setEnvironmentVariables(buildParameters, actionFolder);
  }

  private static async installUnityHub(silent = false) {
    const command = 'brew install unity-hub';
    if (!fs.existsSync(this.unityHubPath)) {
      // Ignoring return code because the log seems to overflow the internal buffer which triggers
      // a false error
      const errorCode = await exec(command, undefined, { silent, ignoreReturnCode: true });
      if (errorCode) {
        throw new Error(`There was an error installing the Unity Editor. See logs above for details.`);
      }
    }
  }

  private static getModuleParametersForTargetPlatform(targetPlatform: string): string {
    let command = '';
    switch (targetPlatform) {
      case 'iOS':
        command += '--module ios ';
        break;
      case 'tvOS':
        command += '--module tvos ';
        break;
      case 'Android':
        command += '--module android ';
        break;
      case 'StandaloneOSX':
        command += '--module mac-il2cpp ';
        break;
      case 'WebGL':
        command += '--module webgl ';
        break;
      default:
        // Consider adding support for all valid targetPlatforms
        // https://docs.unity3d.com/ScriptReference/BuildTarget.html
        throw new Error(`Unsupported module for target platform: ${targetPlatform}.`);
    }

    command += `--childModules`;

    return command.trim();
  }

  private static async installUnity(buildParameters: BuildParameters, silent = false) {
    const unityChangeset = await getUnityChangeset(buildParameters.editorVersion);
    const moduleCommand = this.getModuleParametersForTargetPlatform(buildParameters.targetPlatform);

    const command = `${this.unityHubPath} -- --headless install \
                                          --version ${buildParameters.editorVersion} \
                                          --changeset ${unityChangeset.changeset} \
                                          ${moduleCommand}`;

    // Ignoring return code because the log seems to overflow the internal buffer which triggers
    // a false error
    const errorCode = await exec(command, undefined, { silent, ignoreReturnCode: true });
    if (errorCode) {
      throw new Error(`There was an error installing the Unity Editor. See logs above for details.`);
    }
  }

  private static async setEnvironmentVariables(buildParameters: BuildParameters, actionFolder: string) {
    // Need to set environment variables from here because we execute
    // the scripts on the host for mac
    process.env.ACTION_FOLDER = actionFolder;
    process.env.UNITY_VERSION = buildParameters.editorVersion;
    process.env.UNITY_SERIAL = buildParameters.unitySerial;
    process.env.PROJECT_PATH = buildParameters.projectPath;
    process.env.BUILD_TARGET = buildParameters.targetPlatform;
    process.env.BUILD_NAME = buildParameters.buildName;
    process.env.BUILD_PATH = buildParameters.buildPath;
    process.env.BUILD_FILE = buildParameters.buildFile;
    process.env.BUILD_METHOD = buildParameters.buildMethod;
    process.env.VERSION = buildParameters.buildVersion;
    process.env.ANDROID_VERSION_CODE = buildParameters.androidVersionCode;
    process.env.ANDROID_KEYSTORE_NAME = buildParameters.androidKeystoreName;
    process.env.ANDROID_KEYSTORE_BASE64 = buildParameters.androidKeystoreBase64;
    process.env.ANDROID_KEYSTORE_PASS = buildParameters.androidKeystorePass;
    process.env.ANDROID_KEYALIAS_NAME = buildParameters.androidKeyaliasName;
    process.env.ANDROID_KEYALIAS_PASS = buildParameters.androidKeyaliasPass;
    process.env.ANDROID_TARGET_SDK_VERSION = buildParameters.androidTargetSdkVersion;
    process.env.ANDROID_SDK_MANAGER_PARAMETERS = buildParameters.androidSdkManagerParameters;
    process.env.ANDROID_APP_BUNDLE = buildParameters.androidAppBundle ? 'true' : 'false';
    process.env.EXPORT_AS_GOOGLE_ANDROID_PROJECT = buildParameters.exportAsGoogleAndroidProject ? 'true' : 'false';
    process.env.CUSTOM_PARAMETERS = buildParameters.customParameters;
    process.env.CHOWN_FILES_TO = buildParameters.chownFilesTo;
  }
}

export default SetupMac;
