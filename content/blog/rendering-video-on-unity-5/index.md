+++
date = 2015-02-17
title = "Rendering video on Unity 5"
description = "Unity 5's graphic enhancements are impressive. Can we use it to render production-like quality video? Let me show you a way."
aliases = [
  "/blog/2015-02-17-rendering-video-on-unity-5",
  "/blog/2015/02/17/rendering-video-on-unity-5"
  ]
+++

I've been testing Unity 5 RC1 since a couple of days ago, and I must say, I'm
impressed with the enhancements:

* Performance. The addition of a 64 bit editor is a godsend in high RAM
  machines. Everything is more fluid, and it seems it crashes less. This was a
  very needed enhancement, because working on large projects in Unity 4 was
  horrible.

* The audio system has been remade, and it's now a work of love. Instead of
  placing AudioSources everywhere and having to adjust every one of them by
  hand, you can send them to a mixer channel. Then, you can set global volumes,
  add effects, and even access to the DSP to write your own plugins.

* Graphics. Oh my God, what an enhancement. The new GI system, Enlighten, is
  impressive. I think this will be the version that will finally break the
  stereotype of ugly Unity games.

{{figure(src="disabled-enlighten.jpg", title="Unity 5 - Disabled Enlighten")}}
{{figure(src="enabled-enlighten.jpg", title="Unity 5 - Enabled Enlighten")}}
{{figure(src="enlighten.gif", title="Unity 5 - Real time Enlighten")}}

I've been working quite a few years on TV already and I've seen one of the worse
problems VFX experts have to fight: Render times. However, videogame engines
today are able to get results that would be more than enough for some of these
projects. I know people are already doing this with Unreal Engine 4 and Matinee,
but, is it possible to render video on Unity3D?

There's a saying about piracy: "If you can watch it, you can record it", so we
know we could record the screen. That would not be the best solution, because of
frame jumps, resolution limits and GPU capabilities binding. We want to capture
any resolution, at any FPS, so I got to work on it and... Clearly someone had
thought about it before me, because I found this in the Docs:
[Time.captureFramerate](http://docs.unity3d.com/ScriptReference/Time-captureFramerate.html).

Its usage is really simple. We make a script that sets the desired framerate and
we're ready:

```cs
using System;
using UnityEngine;

public class VideoCapture : MonoBehaviour
{
  public int frameRate = 25;

  void Start()
  {
    Time.captureFramerate = frameRate;
  }
}
```

From now on, we don't care about frame times. Unity will wait until everything
is ready before rendering the next frame, and will adjust times so everything
acts as if working on 25 fps. This allows us to screenshot every frame. Why is
this so important? Because writing screenshots is freaking slow. If we try to do
it without waiting, our deltaTime will go crazy. The easiest way to screenshot
is using
[Application.CaptureScreenshot](http://docs.unity3d.com/ScriptReference/Application.CaptureScreenshot.html),
but it can only capture at our displayed resolution. I want my solution to be
display-independent. How do we do this?

The solution is using a RenderTexture of our desired size, and writing it to
disk.

```cs
using System;
using UnityEngine;
using UnityEngine.Rendering;

public class VideoCapture : MonoBehaviour
{
  public string Flder = "ScreenshotFolder";
  public int FrameRate = 25;
  public int FramesToCapture = 100;

  public int Width = 1920;
  public int Height = 1080;

  private Camera _camera;
  private RenderTexture _renderTexture;
  private Texture2D _tex;

  void Start()
  {
    _camera = GetComponent<Camera>();

    CreateReadTexture();
    CreateRenderTexture();

    Time.captureFramerate = FrameRate;
    System.IO.Directory.CreateDirectory(folder);
  }

  void Update()
  {
    RenderPass();
    DisplayOnScreen();
    QuitIfFinished();
  }

  private void CreateReadTexture()
  {
    _tex = new Texture2D(Width, Height, TextureFormat.RGB24, false);
  }

  private void CreateRenderTexture()
  {
    _renderTexture = new RenderTexture(Width, Height, 24, RenderTextureFormat.ARGB32);
  }

  private void RenderPass() {
    _camera.targetTexture = _renderTexture;
    _camera.Render();
    SaveAfterRender("base", _renderTexture);
  }

  private void DisplayOnScreen() {
    _camera.targetTexture = null;
    _camera.Render();
  }

  private void QuitIfFinished()
  {
    if (Time.frameCount > FramesToCapture)
    {
      Application.Quit();
      UnityEditor.EditorApplication.isPlaying = false;
    }
  }

  private void SaveAfterRender(string prefix, RenderTexture renderTexture)
  {
    var path = String.Format("{0}/{1}_{2:D04}.png", Folder, prefix, Time.frameCount);

    ReadRenderTexture(renderTexture);

    var png = _tex.EncodeToPNG();
    System.IO.File.WriteAllBytes(path, png);
  }

  private void ReadRenderTexture(RenderTexture renderTexture) {
    RenderTexture.active = renderTexture;

    _tex.ReadPixels(new Rect(0.0f, 0.0f, Width, Height), 0, 0);
    _tex.Apply();

    RenderTexture.active = null;
  }
}
```

This script captures every frame to a folder until it reaches our desired
number. It uses our desired resolution, so we can even supersample, and it's, in
fact, a complete solution already.

But I want more. I want real-time reflections. And I want a depth map. Unity 5
added a Reflection Probe system, and even allows it to update via scripting.
This, of course, is slow unless we're using low resolutions. But we don't care
about slow (well, we do, but this is not the kind of slow that can be considered
a trade-off).

So this is the final version of the script:

```cs
using System;
using UnityEngine;
using UnityEngine.Rendering;

public class VideoCapture : MonoBehaviour
{
  public string Folder = "ScreenshotFolder";
  public int FrameRate = 25;
  public int FramesToCapture = 100;

  public int Width = 1920;
  public int Height = 1080;

  public Shader DepthShader;

  public bool SaveDepth;

  private Camera _camera;
  private Camera _depthCamera;
  private RenderTexture _renderTexture;
  private RenderTexture _depthRenderTexture;
  private Texture2D _tex;
  private ReflectionProbe[] _probes;

  void Start()
  {
    _camera = GetComponent<Camera>();

    CreateReadTexture();
    CreateRenderTexture();
    CreateDepthRenderTexture();
    CreateDepthCamera();
    SetupReflectionProbes();

    Time.captureFramerate = FrameRate;
    System.IO.Directory.CreateDirectory(Folder);
  }

  private void CreateReadTexture()
  {
    _tex = new Texture2D(Width, Height, TextureFormat.RGB24, false);
  }

  private void CreateRenderTexture()
  {
    _renderTexture = new RenderTexture(Width, Height, 24, RenderTextureFormat.ARGB32);
  }

  private void CreateDepthRenderTexture()
  {
    _depthRenderTexture = new RenderTexture(Width, Height, 24, RenderTextureFormat.ARGB32);
  }

  private void CreateDepthCamera()
  {
    var depthCameraGameObject = new GameObject("Depth Camera");
    depthCameraGameObject.AddComponent<Camera>();

    _depthCamera = depthCameraGameObject.GetComponent<Camera>();
    _depthCamera.CopyFrom(_camera);
    _depthCamera.SetReplacementShader(DepthShader, null);
  }

  private void SetupReflectionProbes()
  {
    _probes = FindObjectsOfType<ReflectionProbe>();

    foreach (var reflectionProbe in _probes)
    {
      reflectionProbe.refreshMode = ReflectionProbeRefreshMode.ViaScripting;
      reflectionProbe.timeSlicingMode = ReflectionProbeTimeSlicingMode.NoTimeSlicing;
      reflectionProbe.resolution = 1024;
    }
  }

  void Update()
  {
    UpdateReflectionProbes();
    RenderPass();
    RenderDepthPass();
    DisplayOnScreen();
    QuitIfFinished();
  }

  private void DisplayOnScreen()
  {
    _camera.targetTexture = null;
    _camera.Render();
  }

  private void RenderDepthPass()
  {
    if (!SaveDepth) { return; }

    _depthCamera.targetTexture = _depthRenderTexture;
    _depthCamera.Render();
    SaveAfterRender("depth", _depthRenderTexture);
  }

  private void RenderPass()
  {
    _camera.targetTexture = _renderTexture;
    _camera.Render();
    SaveAfterRender("base", _renderTexture);
  }

  private void QuitIfFinished()
  {
    if (Time.frameCount > FramesToCapture)
    {
      Application.Quit();
      UnityEditor.EditorApplication.isPlaying = false;
    }
  }

  private void UpdateReflectionProbes()
  {
    foreach (var reflectionProbe in _probes)
    {
      reflectionProbe.RenderProbe();
    }
  }

  private void SaveAfterRender(string prefix, RenderTexture renderTexture)
  {
    var path = String.Format("{0}/{1}_{2:D04}.png", Folder, prefix, Time.frameCount);

    ReadRenderTexture(renderTexture);

    var png = _tex.EncodeToPNG();
    System.IO.File.WriteAllBytes(path, png);
  }

  private void ReadRenderTexture(RenderTexture renderTexture)
  {
    RenderTexture.active = renderTexture;

    _tex.ReadPixels(new Rect(0.0f, 0.0f, Width, Height), 0, 0);
    _tex.Apply();

    RenderTexture.active = null;
  }
}
```

This version gets every Reflection Probe in the scene, sets them on manual
update mode, sets them to high-resolution (so we get good reflections) and
disables timeslicing, because otherwise they would update over the course of
some frames. Also, it creates a second camera that uses a depth map shader to
save this pass for postprocessing.

Here's a video made with this script:

{{youtube(id="je91FXuS3q0")}}

Right now, this is only a proof of concept, but Im quite sure this could be
used for production material. This new generation of game engines is going to be
quite interesting.

Keep developing.

Edit 19-02-2016: I have used this script for real VFX production, and the
results were superb :).
