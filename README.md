# clock-solar-blueprint

An animated blueprint-style backdrop for Claude Code Desktop. It draws three things on a cyanotype sheet:

- **Clock** (top right): analog clock showing your local time, with a stepping second hand.
- **Solar system** (left, vertically centred): the eight planets at their real heliocentric positions for the current date, computed from JPL Keplerian elements (orbit radii are schematic, orbits drawn as circles).
- **Globe** (bottom right): an orthographic Earth with 24 time-zone meridians, your zone highlighted, and the point where the Sun is overhead right now; centred on the viewer's place, taken from their time zone.

The scene is rebuilt each time the backdrop is drawn, so the clock and planets start from the real moment.

## Where the globe points

The globe centres itself on each viewer: the scene reads the viewer's own time zone (nothing is sent anywhere) and looks up a city in it from a table of about 130 zones in `hooks/scene.ts` (`CITIES`). A zone that is not in the table falls back to its UTC offset (longitude = offset x 15 degrees, latitude 35). Add a line to `CITIES` to pin another zone. Positions of the clock, solar system and globe are the constants at the top of the same file.

## Install

At the prompt of a terminal session:

```
/plugin install clock-solar-blueprint --marketplace 1inq/clock-solar-blueprint
```

From a shell:

```
claude plugin install clock-solar-blueprint --marketplace 1inq/clock-solar-blueprint
```

In the desktop app, where `/plugin` does not run: click + next to the prompt box, then Plugins, Add marketplace with `1inq/clock-solar-blueprint`, then Add plugin.

## Credits

The sheet, grid and paper texture are adapted from the `blueprint` scene of Anthropic's `theme-examples` plugin (Apache-2.0). This plugin is released under the same license; see `LICENSE`.
