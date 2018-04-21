---
date: 2015-04-06
title: Postprocessing scripts in Unity3D
description: Exporting from Unity3D to XCode can be very tedious, especially if you have to edit XCode settings. Let me teach you about postprocessing scripts to make it simpler.
category: Unity3D
aliases:
  - /blog/2015/04/06/postprocessing-scripts
---

## The Joel Test
Have you ever heard about [The Joel
Test](http://www.joelonsoftware.com/articles/fog0000000043.html). Is a test,
designed by Joel Spolsky that measures in a very simple way a company's
development practices quality. It consists on twelve "yes" or "no" questions,
and to pass it, at least ten of them should be "yes". We're not going to talk
about the entire test (read Joel's post for that). Instead, we're going to talk
about the second question.

## Can you make a build in one step?

Unity3D offers great advantages in the development of simple games, like the
ability to test in editor to avoid having to wait for compilation and installing
in a real device. However, we cannot trust only the editor for our game
development. Sometimes, we must test in real hardware to check things like
performance, UX and so.

Of course, when the project is really simple, and it uses only native Unity3D
components, it's as easy as pressing **Ctrl+B** (**Cmd + B** in OSX) and waiting
for it to make an Android APK or an XCode project that will automatically launch
in an iPhone or iPad.

Sadly, life is not that easy when projects grow, or when we're working on
projects with ad-based monetization. In those cases, we'll end up using external
libraries that will require us to modify our XCode or Android Studio settings.
We can keep the project opened and use the replace function to avoid having to
do this more than once in the same computer, but, what if we switch to a new
Unity version? What if we need to open it in another computer? What if there is
any other circumstance that forces us to recreate that project? These look like
exceptional circumstances, but talking from experience, they happen more often
than it looks.

And you will end bored to tears by them.

Are we really going to do that process every single time? Not in a million
years. Larry Wall, Perl's creator said once that the [Three virtues of a
programmer](http://threevirtues.com/) are laziness, impatience, and hubris, and
this is a case that hits in all three of them

* Laziness, because we don't want to repeat this process.
* Impatience, because we don't want anything between us and our project running.
* Hubris, because this is one of the hallmarks of a good developer.

So we need a practical solution for this.

## Unity3D build postprocessors

Fortunately, Unity gives us a powerful tool for this: Postprocessor scripts.
These are scripts with a static function tagged with the PostProcessBuild
attribute, and they run after creating the XCode project. This function receives
a Build Target and our project's path. Something like this:

```csharp
using UnityEditor.Callbacks;

public class BeatDefenseBuildPostProcessor
{
  [PostProcessBuild]
  public static void OnPostprocessBuild (UnityEditor.BuildTarget buildTarget, string path)
  {
    Debug.Log ("Running BeatDefense Postprocessor");
  }
}
```

This script will only show a console log when Unity finishes creating the XCode
project, so let's get into more interesting possibilities. Let me use a real
example of how I use this tool in BeatDefense.

## Using Unity's XCode API

We'll be using the [Unity3D XCode
API](https://bitbucket.org/Unity-Technologies/xcodeapi) for all of this. XCode's
projects are no more than plists, so we can use any tool that allows us to edit
them, but this toolkit is simpler. This is how you open the project:

```csharp
public class BeatDefenseBuildPostProcessor
{
  private static PBXProject _project;

  private static string _path;
  private static string _projectPath;

  private static void OpenProject() {
    _projectPath = _path + "/Unity-iPhone.xcodeproj/project.pbxproj";

    _project = new PBXProject ();
    _project.ReadFromFile (_projectPath);

    _target = _project.TargetGuidByName ("Unity-iPhone");
  }

  private static void CloseProject() {
    File.WriteAllText (_projectPath, _project.WriteToString ());
  }

  [PostProcessBuild]
  public static void OnPostprocessBuild (UnityEditor.BuildTarget buildTarget, string path)
  {
    _path = path;

    OpenProject();

    CloseProject();
  }
}
```

As we can see, opening a project is as easy as sending the path to our
**project.pbxproj**. Once we have it, we get the target. Finally, when we're
done editing, we must write again the project on the original path. This is why
we're storing our project path in the class.

## Adding a Framework
This is probably the most repeated task in an iOS project, and there's two
variants:

### Internal Frameworks
Internal frameworks are those that are part of the iOS SDK. Here, we don't need
to worry about the path, because the SDK knows it already. We only have to link
it, and it's really easy:

```csharp
private static void AddFramework(string framework) {
  if(_project.HasFramework(framework)) return;

  _project.AddFrameworkToProject (_target, framework, false);
}

private static void AddFrameworks() {
  AddFramework("CoreData.framework");
  AddFramework("MediaPlayer.framework");
  AddFramework("Security.framework");

  AddFramework("libxml2.2.dylib");
}

[PostProcessBuild]
public static void OnPostprocessBuild (UnityEditor.BuildTarget buildTarget, string path)
{
  _path = path;

  OpenProject();
  AddFrameworks();
  CloseProject();
}
```

As we can see, we only have to send the Framework's name (with extension, so we
can use things like **libxml2.2.dylib**) to our **AddFramework** method.
Remember that, like almost everything else we're going to do here, it must be
placed between **OpenProject** and **CloseProject**.

### External frameworks
These are a bit more difficult, because we need the physical file to link them.
My personal way to deal with this is creating a folder at the same level than
the **Assets** folder (not inside, because we don't need to import them) and
then make our script copy them to the right place and link them.

```csharp
private static void CopyAndReplaceDirectory (string srcPath, string dstPath)
{
  if (Directory.Exists (dstPath))
    Directory.Delete (dstPath);
  if (File.Exists (dstPath))
    File.Delete (dstPath);

  Directory.CreateDirectory (dstPath);

  foreach (var file in Directory.GetFiles(srcPath))
    File.Copy (file, Path.Combine (dstPath, Path.GetFileName (file)));

  foreach (var dir in Directory.GetDirectories(srcPath))
    CopyAndReplaceDirectory (dir, Path.Combine (dstPath, Path.GetFileName (dir)));
}

private static void AddFramework(string framework) {
  if(_project.HasFramework(framework)) return;

  _project.AddFrameworkToProject (_target, framework, false);
}

private static void AddExternalFramework(string framework) {
  var unityPath = "/../iOSFrameworks/" + framework;
  var fullUnityPath = Application.dataPath + unityPath;

  var frameworkPath = "Frameworks/" + framework;
  var fullFrameworkPath = Path.Combine(_path, frameworkPath);

  CopyAndReplaceDirectory (fullUnityPath, fullFrameworkPath);

  var frameworkFileGuid = _project.AddFile (frameworkPath, frameworkPath, PBXSourceTree.Source);
  _project.AddFileToBuild (_target, frameworkFileGuid);
  AddFramework(framework);
}

private static void AddFrameworks() {
  AddFramework("CoreData.framework");
  AddFramework("MediaPlayer.framework");
  AddFramework("Security.framework");

  AddFramework("libxml2.2.dylib");
}

[PostProcessBuild]
public static void OnPostprocessBuild (UnityEditor.BuildTarget buildTarget, string path)
{
  _path = path;

  OpenProject();
  AddFrameworks();
  CloseProject();
}
```

The **CopyAndReplaceDirectory** recursively copies the content of the folder
given through **srcPath** to **dstPath**, replacing duplicate files if
necessary. **AddExternalFramework** copies the content of **iOSFrameworks** to
the **Frameworks** folder of the XCode project. Next, we add a reference to the
file in the project, because having it in the project folder is not enough. The
file needs an identifier (GUID) to be able to link it.

Once all of this is done, the framework is recognized by the project and we can
add it with **AddFramework** as if it was part of the SDK.

## Adding GameKit
If we're going to use GameKit functions in our project such as GameCenter to
keep scores, we must add it to the required device capabilities. This is done by
adding a value to an array inside **info.plist**. We can do this anywhere
because is a separate file.

```csharp
private static void AddGameKitCapability()
{
  string infoPlistPath = _path + "/Info.plist";

  var plistParser = new PlistDocument ();
  plistParser.ReadFromFile (infoPlistPath);
  plistParser.root ["UIRequiredDeviceCapabilities"].AsArray ().AddString ("gamekit");

  plistParser.WriteToFile (infoPlistPath);
}

[PostProcessBuild]
public static void OnPostprocessBuild (UnityEditor.BuildTarget buildTarget, string path)
{
  _path = path;

  AddGameKitCapability();

  OpenProject();
  CloseProject();
}
```

## Linker flags
This is another simple but important task. We can use this, for example, to add the **-ObjC** flag.

```csharp
private static void SetBuildProperties()
{
  _project.SetBuildProperty (_target, "FRAMEWORK_SEARCH_PATHS", "$(inherited)");
  _project.AddBuildProperty (_target, "FRAMEWORK_SEARCH_PATHS", "$(PROJECT_DIR)/Frameworks");
  _project.AddBuildProperty (_target, "OTHER_LDFLAGS", "-ObjC");
  _project.AddBuildProperty (_target, "OTHER_LDFLAGS", "-fobjc-arc");
}

[PostProcessBuild]
public static void OnPostprocessBuild (UnityEditor.BuildTarget buildTarget, string path)
{
  _path = path;

  OpenProject();

  SetBuildProperties();

  CloseProject();
}
```

We also add the folder were we copy the frameworks to the search path, so the
linker can find them. We're also adding the **-fobjc-arc** flag, because the
Facebook framework requires it.

## Disabling ARC on a single file
Of course, we can't have ARC enabled everywhere, because that would be too easy, and any file that manages memory on its own must be compiled without this flag. This, I admit, has a dirtier solution:

```csharp
private static void DisableArcOnFile(string guid)
{
  _project.RemoveFileFromBuild(_target, guid);
  _project.AddFileToBuildWithFlags(_target, guid, "-fno-objc-arc");
}

private static void DisableArcOnFileByProjectPath(string file)
{
  var guid = _project.FindFileGuidByProjectPath(file);
  DisableArcOnFile(guid);
}

private static void DisableArcOnFileByRealPath(string file)
{
  var guid = _project.FindFileGuidByRealPath(file);

  if(guid == null)
  {
    guid = _project.AddFile(file, file);
  }

  DisableArcOnFile(guid);
}

private static void DisableArcOnFiles()
{
  DisableArcOnFileByProjectPath("Libraries/Plugins/iOS/GADUObjectCache.m");
  DisableArcOnFileByProjectPath("Libraries/Plugins/iOS/GADUInterstitial.m");
  DisableArcOnFileByProjectPath("Libraries/Plugins/iOS/GADURequest.m");
  DisableArcOnFileByProjectPath("Libraries/Plugins/iOS/GADUInterface.m");
  DisableArcOnFileByProjectPath("Libraries/Plugins/iOS/GADUBanner.m");

  DisableArcOnFileByRealPath(Application.dataPath + "/Facebook/Editor/iOS/FbUnityInterface.mm");
}

[PostProcessBuild]
public static void OnPostprocessBuild (UnityEditor.BuildTarget buildTarget, string path)
{
  _path = path;

  OpenProject();

  DisableArcOnFiles();

  CloseProject();
}
```

Yes, what we're doing is removing the folder from the project and then adding it again with the **-fno-objc-arc** flag enabled. It's not the most elegant solution, but it works.

Thanks to this script I can export and run this project from a fresh git clone
without any kind of extra effort. This also allows us to use Unity Cloud Build
to build new versions and upload them to TestFlight.

Keep developing.
