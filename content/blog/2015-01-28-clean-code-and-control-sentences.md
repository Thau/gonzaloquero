---
date: 2015-01-28
title: Clean code and control sentences
category: Unity3D
description: Messy code makes maintenance and collaboration harder. Let's talk a bit about cleaning our control structures.
aliases:
  - /blog/2015/01/28/clean-code-and-control-sentences
---

Today, we're going to talk a bit about clean code, its importance, and how some
little changes in how we write control sentences can improve our code's
readability a lot.

We'll use Unity's new ThirdPersonController, from the [Sample Assets'
Beta](https://www.assetstore.unity3d.com/#!/content/21064) as an example. The
code from these assets is already quite clean, and it's clear they took a lot of
care on them, but everything can be improved further, so let's dig in.

First, let's take a look at the general movement function so we can understand
the inner workings of this controller:

```csharp
// The Move function is designed to be called from a separate component
// based on User input, or an AI control script
public void Move(Vector3 move, bool crouch, bool jump, Vector3 lookPos)
{

    if (move.magnitude > 1) move.Normalize();

    // transfer input parameters to member variables.
    this.moveInput = move;
    this.crouchInput = crouch;
    this.jumpInput = jump;
    this.currentLookPos = lookPos;

    // grab current velocity, we will be changing it.
    velocity = rigidbody.velocity;

    ConvertMoveInput(); // converts the relative move vector into local turn & fwd values

    TurnTowardsCameraForward(); // makes the character face the way the camera is looking

    PreventStandingInLowHeadroom(); // so the character's head doesn't penetrate a low ceiling

    ScaleCapsuleForCrouching(); // so you can fit under low areas when crouching

    ApplyExtraTurnRotation(); // this is in addition to root rotation in the animations

    GroundCheck(); // detect and stick to ground

    SetFriction(); // use low or high friction values depending on the current state

    // control and velocity handling is different when grounded and airborne:
    if (onGround)
    {
        HandleGroundedVelocities();
    }
    else
    {
        HandleAirborneVelocities();
    }

    UpdateAnimator(); // send input and other state parameters to the animator

    // reassign velocity, since it will have been modified by the above functions.
    rigidbody.velocity = velocity;
}
```

As we can see, when the character tries to move, she reads the input, turns
towards the camera, makes some checks, scales if she's crouching, turns, checks
the ground, applies friction, and acts differently if she's grounded or
airborne.

Do you see what we're doing here? This code is telling us a story from the
beginning to the end, letting us know how the character behaves. Reading this
code tells us at a single glance all that we need to know. Everything has been
extracted to explicitly named functions, so we understand what it does even if
we don't know how these functions are written. And, of course, there's an 'if'
clause. In this case, a very simple one: If we're grounded, we act as a grounded
character should act. Else, we act as if airborne. An almost perfect piece of
code.

So let's dig deeper. The new question we're going to ask is "What does the
character do when grounded?", so we'll take the next logical step and go to
HandleGroundedVelocities:

```csharp
private void HandleGroundedVelocities()
{
    velocity.y = 0;

    if (moveInput.magnitude == 0)
    {
        // when not moving this prevents sliding on slopes:
        velocity.x = 0;
        velocity.z = 0;
    }
    // check whether conditions are right to allow a jump:
    bool animationGrounded = animator.GetCurrentAnimatorStateInfo(0).IsName("Grounded");
    bool okToRepeatJump = Time.time > lastAirTime + advancedSettings.jumpRepeatDelayTime;

    if (jumpInput && !crouchInput && okToRepeatJump && animationGrounded)
    {
        // jump!
        onGround = false;
        velocity = moveInput*airSpeed;
        velocity.y = jumpPower;
    }
}
```

An entirely different kind of beast. This piece of code is not as clean as
before, and it's kind of harder to read. Let's follow its story and see where
does it take us:

So first we set vertical velocity to 0. It makes sense. We're grounded so
there's no vertical movement. Then, we find an if-clause that tells us that if
moveInput's magnitude is equal to 0 we won't move.

"moveInput's magnitude is equal to 0". Grunt... What is this moveInput?

```csharp
private Vector3 moveInput;
[...]
public void Move(Vector3 move, bool crouch, bool jump, Vector3 lookPos)
{

    if (move.magnitude > 1) move.Normalize();

    // transfer input parameters to member variables.
    this.moveInput = move;
```

It seems moveInput is a Vector3 that we get via the public Move function.
Probably, the values from the axes of a controller or the equivalent values from
an AI controller.

This is kind of standard in game dev, so let's treat our guess as valid for now.
The problem is that we were reading HandleGroundedVelocities and now we have had
to move to the start of the file to find a variable used in an if-clause because
its condition was way too complex.

So what if instead of asking if "moveInput's magnitude is equal to 0", we ask a
simpler question? How about "is there any input value"? Let's make our first
refactor:

```csharp
private bool NoInput
{
  get { return moveInput.magnitude == 0; }
}

private void HandleGroundedVelocities()
{
  velocity.y = 0;

  if (NoInput)
  {
    // when not moving this prevents sliding on slopes:
    velocity.x = 0;
    velocity.z = 0;
  }

  // check whether conditions are right to allow a jump:
  bool animationGrounded = animator.GetCurrentAnimatorStateInfo(0).IsName("Grounded");
  bool okToRepeatJump = Time.time > lastAirTime + advancedSettings.jumpRepeatDelayTime;

  if (jumpInput && !crouchInput && okToRepeatJump && animationGrounded)
  {
    // jump!
    onGround = false;
    velocity = moveInput * airSpeed;
    velocity.y = jumpPower;
  }
}
```

Our story becomes simpler: As we are grounded, we nullify vertical movement. If
there's no input from the user (be it human or AI), we nullify the velocities of
the rest of axes to prevent sliding on slopes. Way easier to understand:

Next, we find if our animation is in the "Grounded" state and if we can jump
again (because this controller can set a minimum time between jumps). And then,
to our dismay, we find a mire of hate towards future developers:

"If the jump button is pressed, and the crouch button is not, and we are allowed
to jump again, and the animation is in the right state, then we're grounded no
more and our jump power becomes our vertical velocity." I choke every time I try
to read this. We're managing ground movement. There's no place for such a
condition here. Time to refactor again:

```csharp
private bool NoInput
{
  get { return moveInput.magnitude == 0; }
}

private bool CanJump
{
  get
  {
    bool animationGrounded = animator.GetCurrentAnimatorStateInfo(0).IsName("Grounded");
    bool okToRepeatJump = Time.time > lastAirTime + advancedSettings.jumpRepeatDelayTime;

    return jumpInput && !crouchInput && okToRepeatJump && animationGrounded;
  }
}

private void HandleGroundedVelocities()
{

  velocity.y = 0;

  if (NoInput)
  {
    // when not moving this prevents sliding on slopes:
    velocity.x = 0;
    velocity.z = 0;
  }

  // check whether conditions are right to allow a jump:
  if (CanJump)
  {
    // jump!
    onGround = false;
    velocity = moveInput * airSpeed;
    velocity.y = jumpPower;
  }
}
```

Let's read our story again: Nullify vertical velocity because we're grounded. If
there's no input, stop all movement. If we can jump, leave the ground, point our
velocity towards where the user input points and set our vertical velocity.

Finally, we can read this at a simple glance. Two weeks from now, when we come
back to this code, we'll still be able to understand what it does. Making code
easy to read makes it also easy to maintain. There's a saying I like from John
F. Woods: "Always code as if the guy who ends up maintaining your code will be a
violent psychopath who knows where you live." Well, I work alone, but I've
learned something: That violent psychopath has a time machine, and he's me from
the future.

Know that that guy is very dangerous. Don't give him reasons to hate you.

Keep developing.
