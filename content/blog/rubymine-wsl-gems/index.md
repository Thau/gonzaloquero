+++
date = 2020-10-26
title = "RubyMine and WSL2: No gems found"
description = "How to solve an issue with RubyMine with WSL2 as remote."
+++

Trying to use RubyMine with WSL2 as a remote interpreter, but your gems never
load (they show as an empty list on the interpreter section of settings)?

If so, ensure that your WSL2 installation has rsync available and on PATH. Dear
Jetbrains, there should be a clearer error message for this, please.
