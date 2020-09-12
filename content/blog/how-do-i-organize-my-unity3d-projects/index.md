+++
date = 2015-01-26
title = "How do I organize my Unity3D projects"
description = "Unity3D's library and folder system can be quite messy. Let me tell you how do I organize my projects to avoid problems."
aliases = [
  "/blog/2015/01/26/how-do-i-organize-my-unity3d-projects",
  "/blog/2015-01-26-how-do-i-organize-my-unity3d-projects"
  ]
+++

I'm in a love-hate relationship with Unity's Asset Store. I love it madly
because of the huge number of libraries I can use to avoid reinventing the
wheel.

{{ figure(src="Captura-de-pantalla-2015-01-26-a-las-16.37.57.png", title="Love in the shape of a library") }}

On the other side, I hate it because of this:

{{ figure(src="Captura-de-pantalla-2015-01-26-a-las-16.41.08-e1422287035404.png", title="So, where are your things?") }}

I mean, of course, the fact that there's not a standard way of organizing a
Unity project. There are some [special
folders](http://docs.unity3d.com/es/current/Manual/SpecialFolders.html), but no
one has said "Hey! Let's put every external library here!" There are some epic
examples here, like a folder named "Src" that tells us absolutely nothing about
its contents, or even worse, another folder named "root".

I've experimented with multiple ways of organization while developing my
projects. My first attempt was creating a Libraries folder where I put
everything that wasn't self-made, and then using root subfolders to organize my
own code. I recommend using this system only if you are a masochist that likes
wasting your time and are willing to fight the load of problems you'll find when
moving libraries from their folders. These problems, by the way, are usually
caused because so-called programmers love to hard-code routes. However, we're
not here to criticize horrible decisions, but to fix this.

Our Assets folder root is lost, so we don't want to mix our content with all the
crap that will unavoidably end there. Once again, I speak from experience:

{{ figure(src="Captura-de-pantalla-2015-01-26-a-las-17.14.40.png", title="If I could go back in time, I would punch myself until I learned NOT to do this") }}

So let's forget the root folder. It's not for us. It hates us, and we hate it,
so there's only one solution: Creating a folder where all of our project will
go:

{{ figure(src="Captura-de-pantalla-2015-01-26-a-las-16.52.51.png", title="This.") }}

Even if it's not necessary, putting an underscore before the name to make it be
the first folder in the hierarchy will save one or two seconds every time we are
looking for it, and, as we programmers know, removing one or two instructions
from a loop that runs millions of times is a great optimization. But let's go
even further.

What is inside this folder?

{{ figure(src="Captura-de-pantalla-2015-01-26-a-las-17.26.29.png", title="Inside a project folder") }}

Some of these folders are exclusive to this project. It's not a bad thing to
deviate from this standard to adapt it to the particular needs of a project.
However, two folders that should be always there are Scripts, Tests (Test your
games, love the [Unity Test
Tools](https://www.assetstore.unity3d.com/#!/content/13802). We'll talk about
this some other time), and Editor, because I've yet to see a project that
doesn't benefit from some customized tools.

I believe Unity needs a standard for Asset Store library organization, even if
it is just everybody using an AssetStore folder or something like that, but,
meanwhile, we'll do whatever is in our hands to keep our projects organized,
becoming better and more productive developers.

Keep developing.
