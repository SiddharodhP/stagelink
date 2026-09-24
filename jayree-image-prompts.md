# jayree.io — homepage image prompts

**17 prompts, each complete on its own.** Copy one code block, paste it into
your image generator, done. The style, the palette, the negatives and the
composition notes are already baked into every single one — there is nothing
to append and nothing to remember.

Save each result as `.jpg` (quality 85) into `public/marketing/` using the
exact filename in the heading, then tell me and I'll wire them in.

> **Note on the headings.** The "Set A / category tile / masonry" labels are
> for me, not the generator — telling it "this is a category tile" does
> nothing. What *does* matter is the composition, so wherever placement
> changes the framing ("leave the right two thirds open for the headline"),
> that instruction is written into the prompt itself.

> **Midjourney users:** the pixel size is stated in words inside each prompt,
> which most generators honour. If yours needs a flag, append `--ar 16:9`
> (hero), `--ar 4:5` (category tiles), `--ar 5:7` / `--ar 7:5` (masonry),
> `--ar 4:3` (how-it-works) or `--ar 12:5` (CTA band).

---

# SET A — HERO

## A1 · `hero-figure.jpg` · 2000 × 2400

The Ballance-style hero: a centred figure rising out of the gradient, presenting
something to the viewer. Note the two things that make it work — the subject
fills most of the frame width, and the camera is angled toward you rather than
held side-on. The page masks about 30% off each side to dissolve the edges, so a
narrow subject loses a lot of itself to that mask.

```
A photographer filling most of the frame, seen from the waist up against a plain
gradient background, head tilted back and eyes closed with the chin raised
toward the light. Both hands hold a black mirrorless camera out in front of the
chest, angled toward the viewer so the lens barrel faces us and catches the
light, presented deliberately, the way someone shows you a thing they are proud
of. They wear a simple dark charcoal high-necked top. A single hard key light
from above rakes across the cheekbone, the jaw and the top of the lens.

The background is a smooth vertical gradient from deep warm near-black at the top
to a warm off-white at the bottom, completely empty of texture or objects, and
the figure's lower edge dissolves softly into that pale bottom.

Centred subject, 2000x2400 pixels, 5:6 aspect ratio. The figure spans roughly
three quarters of the frame width, shoulders coming close to the left and right
edges, with the camera large and prominent in the lower middle of the frame.
Leave a generous area of empty dark gradient above the head for headline text to
sit over.

Editorial portrait photography, shot on a full-frame camera with an 85mm lens at
f/2.8, single hard key light with deep controlled shadow, high contrast. Warm
neutral grade, deep warm black (#1a1713) through to warm off-white (#f7f4ee),
with burnt orange (#d6440f) appearing only as a thin camera strap. Fine film
grain, no HDR. Photorealistic, sharp focus on the face and the camera body. No
text, letters, words, watermarks, logos or user interface anywhere in the image.
Avoid deformed hands, extra fingers, plastic airbrushed skin, and anyone smiling
at the camera.
```

### Superseded · `hero-wide.jpg` · 2400 × 1350

The original landscape rooftop frame. Still in the repo and still used as a
fallback, but the hero is a centred portrait now, so this is not the shot to
regenerate.

```
A photographer crouched low on a sunlit rooftop terrace at golden hour, seen
from behind and slightly to the side, raising a black mirrorless camera toward
a couple who are far away and out of focus. Warm late-afternoon light rakes
across weathered concrete. A burnt-orange camera strap is the only strong
colour in the frame. Very wide shot, 2400x1350 pixels, 16:9 aspect ratio, with
the figure kept to the left third and the right two thirds left as open sky
and empty space for headline text to sit over.

Shot on a full-frame camera with a 50mm lens at f/2 in natural light. Warm
neutral grade, muted earthy palette of warm off-white (#f7f4ee) and deep warm
black (#1a1713), with burnt orange (#d6440f) as the only strong colour and only
on one small object. Soft fine film grain, gentle highlight roll-off, no HDR,
no oversaturation. Candid and unposed, calm off-centre composition,
photorealistic, high detail. No text, letters, words, watermarks, logos or user
interface anywhere in the image. Avoid deformed hands, extra fingers, plastic
airbrushed skin, and anyone smiling at the camera.
```

---

# SET B — CATEGORY TILES

Six tiles, one per real category. All portrait 4:5.

## B1 · Photography · `cat-photography.jpg` · 1200 × 1500

```
Close three-quarter view of a photographer's hands cradling a black mirrorless
camera, fingers adjusting the lens ring. Framed at chest height with the head
cropped entirely out of frame. Softly blurred warm interior behind — pale
plaster wall, a sliver of window light. A thin burnt-orange strap loops across
the wrist. Shallow depth of field with the lens barrel tack sharp. Vertical
portrait composition, 1200x1500 pixels, 4:5 aspect ratio.

Shot on a full-frame camera with a 50mm lens at f/2 in natural light. Warm
neutral grade, muted earthy palette of warm off-white (#f7f4ee) and deep warm
black (#1a1713), with burnt orange (#d6440f) as the only strong colour and only
on one small object. Soft fine film grain, gentle highlight roll-off, no HDR,
no oversaturation. Candid and unposed, calm off-centre composition,
photorealistic, high detail. No text, letters, words, watermarks, logos or user
interface anywhere in the image. Avoid deformed hands, extra fingers, plastic
airbrushed skin, and anyone smiling at the camera.
```

## B2 · Videography · `cat-videography.jpg` · 1200 × 1500

```
A cinema camera mounted on a three-axis gimbal, held at waist height by an
operator whose torso is visible but whose head is cropped above the top of the
frame. Matte black rig with a small burnt-orange cable coiled around the
handle. Standing in a bright empty hall with tall windows, warm light spilling
across a pale concrete floor. Vertical portrait composition, 1200x1500 pixels,
4:5 aspect ratio, with the rig filling the lower two thirds.

Shot on a full-frame camera with a 50mm lens at f/2 in natural light. Warm
neutral grade, muted earthy palette of warm off-white (#f7f4ee) and deep warm
black (#1a1713), with burnt orange (#d6440f) as the only strong colour and only
on one small object. Soft fine film grain, gentle highlight roll-off, no HDR,
no oversaturation. Candid and unposed, calm off-centre composition,
photorealistic, high detail. No text, letters, words, watermarks, logos or user
interface anywhere in the image. Avoid deformed hands, extra fingers, plastic
airbrushed skin, and anyone smiling at the camera.
```

## B3 · Video Editing & Post · `cat-video-editing.jpg` · 1200 × 1500

```
Over-the-shoulder view of an editor at a desk in a dim warm room, facing two
monitors that glow softly — the screen content is abstract, blurred and
completely unreadable, with no interface elements visible. Hands rest on a
small control surface with one illuminated burnt-orange dial. A mug and a
notebook sit on warm oak. Warm practical lamp light with deep soft shadows. The
person's back is in near-silhouette. Vertical portrait composition, 1200x1500
pixels, 4:5 aspect ratio.

Shot on a full-frame camera with a 50mm lens at f/2 in natural light. Warm
neutral grade, muted earthy palette of warm off-white (#f7f4ee) and deep warm
black (#1a1713), with burnt orange (#d6440f) as the only strong colour and only
on one small object. Soft fine film grain, gentle highlight roll-off, no HDR,
no oversaturation. Candid and unposed, calm off-centre composition,
photorealistic, high detail. No text, letters, words, watermarks, logos or user
interface anywhere in the image. Avoid deformed hands, extra fingers, plastic
airbrushed skin, and anyone smiling at the camera.
```

## B4 · Photo Editing & Retouching · `cat-photo-editing.jpg` · 1200 × 1500

```
A hand holding a stylus above a graphics tablet on a pale oak desk, a laptop
open beside it showing an indistinct warm-toned image with nothing readable on
screen. A colour calibration card and a small stack of printed photographs sit
in the foreground. Bright diffused daylight from the left. Shot from an
overhead three-quarter angle with the head not in frame. Clean and quiet with
generous empty desk surface. Vertical portrait composition, 1200x1500 pixels,
4:5 aspect ratio.

Shot on a full-frame camera with a 50mm lens at f/2 in natural light. Warm
neutral grade, muted earthy palette of warm off-white (#f7f4ee) and deep warm
black (#1a1713), with burnt orange (#d6440f) as the only strong colour and only
on one small object. Soft fine film grain, gentle highlight roll-off, no HDR,
no oversaturation. Candid and unposed, calm off-centre composition,
photorealistic, high detail. No text, letters, words, watermarks, logos or user
interface anywhere in the image. Avoid deformed hands, extra fingers, plastic
airbrushed skin, and anyone smiling at the camera.
```

## B5 · Motion Graphics & Animation · `cat-motion-graphics.jpg` · 1200 × 1500

```
A tabletop still life of creative tools shot from directly overhead on a warm
off-white surface: a graphics tablet, a stylus, scattered paper storyboard
frames sketched in loose pencil, a burnt-orange marker, and a small speaker. No
screens anywhere and no writing legible on the storyboards. Soft even daylight
casting long gentle shadows to the right. Vertical portrait composition,
1200x1500 pixels, 4:5 aspect ratio, with breathing room around the objects.

Shot on a full-frame camera with a 50mm lens at f/2 in natural light. Warm
neutral grade, muted earthy palette of warm off-white (#f7f4ee) and deep warm
black (#1a1713), with burnt orange (#d6440f) as the only strong colour and only
on one small object. Soft fine film grain, gentle highlight roll-off, no HDR,
no oversaturation. Candid and unposed, calm off-centre composition,
photorealistic, high detail. No text, letters, words, watermarks, logos or user
interface anywhere in the image. Avoid deformed hands, extra fingers, plastic
airbrushed skin, and anyone smiling at the camera.
```

## B6 · Drone & Aerial · `cat-drone-aerial.jpg` · 1200 × 1500

```
A compact grey drone hovering about a metre above tall dry grass, caught
mid-launch, with a person's hands lowered just below it and their body out of
frame. Golden late-afternoon backlight rims the spinning propellers. A distant
treeline is heavily blurred. A burnt-orange controller lanyard is visible at
the bottom edge. Vertical portrait composition, 1200x1500 pixels, 4:5 aspect
ratio, with the drone in the upper third against open warm sky.

Shot on a full-frame camera with a 50mm lens at f/2 in natural light. Warm
neutral grade, muted earthy palette of warm off-white (#f7f4ee) and deep warm
black (#1a1713), with burnt orange (#d6440f) as the only strong colour and only
on one small object. Soft fine film grain, gentle highlight roll-off, no HDR,
no oversaturation. Candid and unposed, calm off-centre composition,
photorealistic, high detail. No text, letters, words, watermarks, logos or user
interface anywhere in the image. Avoid deformed hands, extra fingers, plastic
airbrushed skin, and anyone smiling at the camera.
```

---

# SET C — MASONRY WALL

Orientations are deliberately mixed — that is what stops a masonry grid
looking like a spreadsheet.

## C1 · `work-01.jpg` · 1000 × 1400 (portrait)

```
A bride's hands holding a loose bouquet of cream and rust-coloured flowers at
waist height, dress fabric filling the lower frame, her face not visible at
all. Soft overcast daylight. Delicate detail in the petals. Vertical portrait
composition, 1000x1400 pixels, 5:7 aspect ratio.

Shot on a full-frame camera with a 50mm lens at f/2 in natural light. Warm
neutral grade, muted earthy palette of warm off-white (#f7f4ee) and deep warm
black (#1a1713), with burnt orange (#d6440f) as the only strong colour and only
on one small object. Soft fine film grain, gentle highlight roll-off, no HDR,
no oversaturation. Candid and unposed, calm off-centre composition,
photorealistic, high detail. No text, letters, words, watermarks, logos or user
interface anywhere in the image. Avoid deformed hands, extra fingers, plastic
airbrushed skin, and anyone smiling at the camera.
```

## C2 · `work-02.jpg` · 1400 × 1000 (landscape)

```
A wide empty banquet hall being set up before an event — round tables, folded
linen, a single burnt-orange chair among neutral ones, low warm sun through
tall windows throwing long shadows across the floor. Completely empty of
people. Horizontal landscape composition, 1400x1000 pixels, 7:5 aspect ratio.

Shot on a full-frame camera with a 50mm lens at f/2 in natural light. Warm
neutral grade, muted earthy palette of warm off-white (#f7f4ee) and deep warm
black (#1a1713), with burnt orange (#d6440f) as the only strong colour and only
on one small object. Soft fine film grain, gentle highlight roll-off, no HDR,
no oversaturation. Candid and unposed, calm off-centre composition,
photorealistic, high detail. No text, letters, words, watermarks, logos or user
interface anywhere in the image. Avoid deformed hands, extra fingers, plastic
airbrushed skin, and anyone smiling at the camera.
```

## C3 · `work-03.jpg` · 1000 × 1400 (portrait)

```
Skincare bottles in amber glass arranged on a pale stone block, lit by a single
hard window light throwing a crisp diagonal shadow across the surface. A sprig
of dried foliage leans against the tallest bottle. Minimal product photography
with the labels completely blank and unprinted. Vertical portrait composition,
1000x1400 pixels, 5:7 aspect ratio.

Shot on a full-frame camera with a 50mm lens at f/2 in natural light. Warm
neutral grade, muted earthy palette of warm off-white (#f7f4ee) and deep warm
black (#1a1713), with burnt orange (#d6440f) as the only strong colour and only
on one small object. Soft fine film grain, gentle highlight roll-off, no HDR,
no oversaturation. Candid and unposed, calm off-centre composition,
photorealistic, high detail. No text, letters, words, watermarks, logos or user
interface anywhere in the image. Avoid deformed hands, extra fingers, plastic
airbrushed skin, and anyone smiling at the camera.
```

## C4 · `work-04.jpg` · 1400 × 1000 (landscape)

```
An aerial view looking straight down at a winding coastal road cutting through
scrubland, one small car mid-frame, late-afternoon light casting long shadows.
Warm desaturated earth tones. No road markings, no signage. Horizontal
landscape composition, 1400x1000 pixels, 7:5 aspect ratio.

Shot on a full-frame camera with a 50mm lens at f/2 in natural light. Warm
neutral grade, muted earthy palette of warm off-white (#f7f4ee) and deep warm
black (#1a1713), with burnt orange (#d6440f) as the only strong colour and only
on one small object. Soft fine film grain, gentle highlight roll-off, no HDR,
no oversaturation. Candid and unposed, calm off-centre composition,
photorealistic, high detail. No text, letters, words, watermarks, logos or user
interface anywhere in the image. Avoid deformed hands, extra fingers, plastic
airbrushed skin, and anyone smiling at the camera.
```

## C5 · `work-05.jpg` · 1000 × 1400 (portrait)

```
A musician's hands on an acoustic guitar in a dim warm room, shot close with
the face cropped out of frame. One warm practical lamp behind creates a soft
rim of light along the edge of the instrument. Fine grain and deep soft shadow.
Vertical portrait composition, 1000x1400 pixels, 5:7 aspect ratio.

Shot on a full-frame camera with a 50mm lens at f/2 in natural light. Warm
neutral grade, muted earthy palette of warm off-white (#f7f4ee) and deep warm
black (#1a1713), with burnt orange (#d6440f) as the only strong colour and only
on one small object. Soft fine film grain, gentle highlight roll-off, no HDR,
no oversaturation. Candid and unposed, calm off-centre composition,
photorealistic, high detail. No text, letters, words, watermarks, logos or user
interface anywhere in the image. Avoid deformed hands, extra fingers, plastic
airbrushed skin, and anyone smiling at the camera.
```

## C6 · `work-06.jpg` · 1400 × 1000 (landscape)

```
Behind the scenes on a small set: a softbox on a stand, a light meter resting
on a stool, cables taped down to a pale floor, and one crew member blurred in
the deep background walking out of frame. Warm, calm, unglamorous and real
rather than styled. Horizontal landscape composition, 1400x1000 pixels, 7:5
aspect ratio.

Shot on a full-frame camera with a 50mm lens at f/2 in natural light. Warm
neutral grade, muted earthy palette of warm off-white (#f7f4ee) and deep warm
black (#1a1713), with burnt orange (#d6440f) as the only strong colour and only
on one small object. Soft fine film grain, gentle highlight roll-off, no HDR,
no oversaturation. Candid and unposed, calm off-centre composition,
photorealistic, high detail. No text, letters, words, watermarks, logos or user
interface anywhere in the image. Avoid deformed hands, extra fingers, plastic
airbrushed skin, and anyone smiling at the camera.
```

---

# SET D — HOW IT WORKS

## D1 · "Post the work" · `step-post.jpg` · 1200 × 900

```
A client at a kitchen table with a laptop and a notebook, writing by hand, seen
from the side with the head cropped above the eyes. Morning light, a coffee
cup, a phone lying face down. Calm and domestic rather than corporate, with the
laptop screen turned away so nothing on it is visible. Horizontal composition,
1200x900 pixels, 4:3 aspect ratio.

Shot on a full-frame camera with a 50mm lens at f/2 in natural light. Warm
neutral grade, muted earthy palette of warm off-white (#f7f4ee) and deep warm
black (#1a1713), with burnt orange (#d6440f) as the only strong colour and only
on one small object. Soft fine film grain, gentle highlight roll-off, no HDR,
no oversaturation. Candid and unposed, calm off-centre composition,
photorealistic, high detail. No text, letters, words, watermarks, logos or user
interface anywhere in the image. Avoid deformed hands, extra fingers, plastic
airbrushed skin, and anyone smiling at the camera.
```

## D2 · "Pick your person" · `step-pick.jpg` · 1200 × 900

```
Two people sitting at a small cafe table mid-conversation, both seen from
behind and to the side so neither face is visible, one gesturing toward a
tablet lying flat between them. Warm afternoon light through a window. Relaxed
posture, the feeling of an easy conversation rather than an interview. The
tablet screen is dark and blank. Horizontal composition, 1200x900 pixels, 4:3
aspect ratio.

Shot on a full-frame camera with a 50mm lens at f/2 in natural light. Warm
neutral grade, muted earthy palette of warm off-white (#f7f4ee) and deep warm
black (#1a1713), with burnt orange (#d6440f) as the only strong colour and only
on one small object. Soft fine film grain, gentle highlight roll-off, no HDR,
no oversaturation. Candid and unposed, calm off-centre composition,
photorealistic, high detail. No text, letters, words, watermarks, logos or user
interface anywhere in the image. Avoid deformed hands, extra fingers, plastic
airbrushed skin, and anyone smiling at the camera.
```

## D3 · "Agree stages, then pay" · `step-pay.jpg` · 1200 × 900

```
A close overhead shot of two hands meeting in a relaxed handshake across a pale
oak table, with a notebook marked in loose pencil and a phone beside them. Only
forearms and hands are in frame. Soft diffused daylight. One burnt-orange
notebook edge provides the single note of colour. Horizontal composition,
1200x900 pixels, 4:3 aspect ratio.

Shot on a full-frame camera with a 50mm lens at f/2 in natural light. Warm
neutral grade, muted earthy palette of warm off-white (#f7f4ee) and deep warm
black (#1a1713), with burnt orange (#d6440f) as the only strong colour and only
on one small object. Soft fine film grain, gentle highlight roll-off, no HDR,
no oversaturation. Candid and unposed, calm off-centre composition,
photorealistic, high detail. No text, letters, words, watermarks, logos or user
interface anywhere in the image. Avoid deformed hands, extra fingers, plastic
airbrushed skin, and anyone smiling at the camera.
```

---

# SET E — CLOSING CTA BAND

## E1 · `cta-band.jpg` · 2400 × 1000

```
An extremely wide, quiet shot of an empty photography studio at the end of the
day — a paper backdrop rolled down, a light stand folded to one side, warm low
sun entering through a large window on the left and stretching across a dusty
concrete floor. Completely empty of people. Cinematic stillness, very warm and
very calm. Ultra-wide composition, 2400x1000 pixels, 12:5 aspect ratio, with
the right half kept in deep shadow and free of detail so text can sit over it.

Shot on a full-frame camera with a 50mm lens at f/2 in natural light. Warm
neutral grade, muted earthy palette of warm off-white (#f7f4ee) and deep warm
black (#1a1713), with burnt orange (#d6440f) as the only strong colour and only
on one small object. Soft fine film grain, gentle highlight roll-off, no HDR,
no oversaturation. Candid and unposed, calm off-centre composition,
photorealistic, high detail. No text, letters, words, watermarks, logos or user
interface anywhere in the image. Avoid deformed hands, extra fingers, plastic
airbrushed skin, and anyone smiling at the camera.
```

---

# BEFORE YOU START

**Faces are what give AI images away.** Almost every prompt above is framed
over-the-shoulder, from behind, cropped at the chin, or hands only. That is
deliberate — a photograph of hands on a camera never looks fake, a
front-facing portrait usually does. If a generator keeps adding a face anyway,
add "head completely out of frame" and regenerate.

**Generate 3–4 variants of each and pick for consistency with the set, not for
the prettiest single image.** One shot at a different colour temperature ruins
the whole wall.

**Do Set A and Set B first** — the hero plus six category tiles is enough for
me to rebuild the page and for you to judge whether the direction works. C, D
and E can follow.

**These are not portfolio work.** Set C will read as work by photographers on
your platform. On a marketplace *for* photographers, being caught passing AI
images off as real client work would land badly with exactly the people you
are recruiting. I will label that section as inspiration, not portfolio, and
swap in real work as soon as you have users who consent to it.

**Save as** `.jpg` at quality 85 into `public/marketing/` using the exact
filenames above. Anything over ~500 KB and I will compress it before wiring
it in.

---

# SET F — SERVICE SLIDER

Six landscape frames, one per claim in the two benefit sliders. They render at
about 360px wide on desktop, so each one carries a single clear subject rather
than a busy scene -- detail that needs looking for is detail nobody will see.

All six are 1400 x 1186, a 1.18:1 landscape ratio, which is the aspect the
slider frame uses. Drop them in `public/marketing/` under the filenames below
and I will convert and swap them for the craft-tile placeholders currently
standing in.

**For freelancers**

## F1 · Paid per stage · `svc-paid-per-stage.jpg` · 1400 x 1186

```
A photographer at the end of a shoot, crouched beside an open hard case on a
pale studio floor, sliding a lens into its foam cut-out with both hands. Body
language relaxed, the work finished. Warm late light from a window to the left
rakes across the case lid. A burnt-orange camera strap is coiled beside the
case. Head cropped above the frame. Horizontal composition, 1400x1186 pixels,
1.18:1 aspect ratio, with the case and hands filling the lower two thirds.
Shot on a full-frame camera with a 50mm lens at f/2 in natural light. Warm
neutral grade, muted earthy palette of warm off-white (#f7f4ee) and deep warm
black (#1a1713), with burnt orange (#d6440f) as the only strong colour and only
on one small object. Soft fine film grain, gentle highlight roll-off, no HDR,
no oversaturation. Candid and unposed, photorealistic, high detail. No text,
letters, words, numbers, watermarks, logos or user interface anywhere in the
image, and nothing readable on any screen or paper. Avoid deformed hands, extra
fingers, plastic airbrushed skin, and anyone smiling at the camera.
```

## F2 · You agree the plan · `svc-agree-the-plan.jpg` · 1400 x 1186

```
Two people on the same side of a table, leaning over a sheet of paper between
them, one pointing at it with a pen while the other rests a hand flat on the
edge. Seen from across the table at chest height, both heads cropped out of
frame. The paper carries loose pencil marks and boxes but nothing legible. A
burnt-orange pen cap sits on the table. Bright diffused daylight. Horizontal
composition, 1400x1186 pixels, 1.18:1 aspect ratio.
Shot on a full-frame camera with a 50mm lens at f/2 in natural light. Warm
neutral grade, muted earthy palette of warm off-white (#f7f4ee) and deep warm
black (#1a1713), with burnt orange (#d6440f) as the only strong colour and only
on one small object. Soft fine film grain, gentle highlight roll-off, no HDR,
no oversaturation. Candid and unposed, photorealistic, high detail. No text,
letters, words, numbers, watermarks, logos or user interface anywhere in the
image, and nothing readable on any screen or paper. Avoid deformed hands, extra
fingers, plastic airbrushed skin, and anyone smiling at the camera.
```

## F3 · Invoice in one click · `svc-invoice-one-click.jpg` · 1400 x 1186

```
A single hand resting on a laptop trackpad on a pale oak desk, caught in the
small moment just after pressing. The laptop is seen from behind and to the
side so the screen is angled away and nothing on it is visible. A closed
notebook and a cup sit beside it, and a burnt-orange bookmark ribbon hangs from
the notebook. Quiet morning light from the left, head not in frame. Horizontal
composition, 1400x1186 pixels, 1.18:1 aspect ratio.
Shot on a full-frame camera with a 50mm lens at f/2 in natural light. Warm
neutral grade, muted earthy palette of warm off-white (#f7f4ee) and deep warm
black (#1a1713), with burnt orange (#d6440f) as the only strong colour and only
on one small object. Soft fine film grain, gentle highlight roll-off, no HDR,
no oversaturation. Candid and unposed, photorealistic, high detail. No text,
letters, words, numbers, watermarks, logos or user interface anywhere in the
image, and nothing readable on any screen or paper. Avoid deformed hands, extra
fingers, plastic airbrushed skin, and anyone smiling at the camera.
```

**For clients**

## C1 · See the plan before you pay · `svc-see-the-plan.jpg` · 1400 x 1186

```
An overhead shot of a pale table with four printed sheets laid out in a row,
their edges slightly overlapping, each carrying loose sketched boxes and pencil
lines with no readable writing. A hand at the edge of the frame is squaring one
sheet with the others. A burnt-orange marker rests across the corner. Soft even
daylight with long gentle shadows. Horizontal composition, 1400x1186 pixels,
1.18:1 aspect ratio.
Shot on a full-frame camera with a 50mm lens at f/2 in natural light. Warm
neutral grade, muted earthy palette of warm off-white (#f7f4ee) and deep warm
black (#1a1713), with burnt orange (#d6440f) as the only strong colour and only
on one small object. Soft fine film grain, gentle highlight roll-off, no HDR,
no oversaturation. Candid and unposed, photorealistic, high detail. No text,
letters, words, numbers, watermarks, logos or user interface anywhere in the
image, and nothing readable on any screen or paper. Avoid deformed hands, extra
fingers, plastic airbrushed skin, and anyone smiling at the camera.
```

## C2 · Money moves on approval · `svc-money-on-approval.jpg` · 1400 x 1186

```
Two hands holding a single photographic print up toward a window, examining it,
the print catching the light from behind so its edges glow. The image on the
print is a soft indistinct warm blur with nothing recognisable in it. A second
small stack of prints rests on the sill below, one with a burnt-orange sticky
tab on its edge. Head cropped out of frame. Horizontal composition, 1400x1186
pixels, 1.18:1 aspect ratio.
Shot on a full-frame camera with a 50mm lens at f/2 in natural light. Warm
neutral grade, muted earthy palette of warm off-white (#f7f4ee) and deep warm
black (#1a1713), with burnt orange (#d6440f) as the only strong colour and only
on one small object. Soft fine film grain, gentle highlight roll-off, no HDR,
no oversaturation. Candid and unposed, photorealistic, high detail. No text,
letters, words, numbers, watermarks, logos or user interface anywhere in the
image, and nothing readable on any screen or paper. Avoid deformed hands, extra
fingers, plastic airbrushed skin, and anyone smiling at the camera.
```

## C3 · Browse by city and craft · `svc-browse-city-craft.jpg` · 1400 x 1186

```
A camera bag and a folded tripod resting on a low rooftop ledge at dusk, with a
wide city skyline stretched out behind them, softly out of focus. Warm fading
light along the horizon, cool blue shadow across the ledge. A burnt-orange strap
hangs over the edge of the bag. No people in frame. Horizontal composition,
1400x1186 pixels, 1.18:1 aspect ratio, with the bag in the lower left and the
skyline filling the right.
Shot on a full-frame camera with a 50mm lens at f/2 in natural light. Warm
neutral grade, muted earthy palette of warm off-white (#f7f4ee) and deep warm
black (#1a1713), with burnt orange (#d6440f) as the only strong colour and only
on one small object. Soft fine film grain, gentle highlight roll-off, no HDR,
no oversaturation. Candid and unposed, photorealistic, high detail. No text,
letters, words, numbers, watermarks, logos or user interface anywhere in the
image, and nothing readable on any screen or paper. Avoid deformed hands, extra
fingers, plastic airbrushed skin, and anyone smiling at the camera.
```

---

# SET G — THE TWO MISSING SLIDER FRAMES

The both-sides section went from three points a side to four, so it needs eight
frames and six exist. These are the two with nothing to reuse. Everything else
was remapped: `svc-browse-city-craft` now carries "Discover relevant projects",
`svc-see-the-plan` carries "Post jobs in minutes", `svc-agree-the-plan` carries
"Work with confidence using milestones", and `svc-money-on-approval` carries
"Review proposals and portfolios".

Same 1400 x 1186 (1.18:1) as Set F, and the same grade -- the eight read as one
set, and the panel behind them is the only thing that changes colour. Drop them
in `public/marketing/` under these filenames and I will convert them to WebP
and swap out the two stand-ins.

## G1 - Apply with reusable proposals - `svc-reusable-proposals.jpg` - 1400 x 1186

Currently standing in: `svc-see-the-plan.webp`, which is also doing its own job
on the client side. Two panels showing the same picture is the thing to fix.

```
A person at a desk assembling a proposal from parts they already have: one
printed page squared in front of them, a near-identical second page set beside
it, and a hand drawing a third from an open card folder to join the pair. Seen
from across the desk at chest height, head cropped out of frame. The pages
carry loose grey typographic blocks and a small sketched thumbnail grid, none
of it readable. A burnt-orange paperclip holds two of them together. Warm
window light from the left, quiet and unhurried. Horizontal composition,
1400x1186 pixels, 1.18:1 aspect ratio, with the pages and hands filling the
lower two thirds.
Shot on a full-frame camera with a 50mm lens at f/2 in natural light. Warm
neutral grade, muted earthy palette of warm off-white (#f7f4ee) and deep warm
black (#1a1713), with burnt orange (#d6440f) as the only strong colour and only
on one small object. Soft fine film grain, gentle highlight roll-off, no HDR,
no oversaturation. Candid and unposed, photorealistic, high detail. No text,
letters, words, numbers, watermarks, logos or user interface anywhere in the
image, and nothing readable on any screen or paper. Avoid deformed hands, extra
fingers, plastic airbrushed skin, and anyone smiling at the camera.
```

## G2 - Keep everything in one place - `svc-everything-one-place.jpg` - 1400 x 1186

Currently standing in: `svc-invoice-one-click.webp`, which is also carrying
"Manage work in one place" in the orange panel.

```
An overhead shot of one tidy desk holding an entire job at once: a closed
laptop, a contact sheet of small photographs, a folded document, a lens cap and
a notebook, every edge squared to the same invisible grid on pale oak. Nothing
scattered, nothing stacked at an angle, nothing readable on any surface. A
burnt-orange elastic band is around the notebook. Soft even daylight with long
gentle shadows, no people in frame. Horizontal composition, 1400x1186 pixels,
1.18:1 aspect ratio, with the desk filling the frame edge to edge.
Shot on a full-frame camera with a 50mm lens at f/2 in natural light. Warm
neutral grade, muted earthy palette of warm off-white (#f7f4ee) and deep warm
black (#1a1713), with burnt orange (#d6440f) as the only strong colour and only
on one small object. Soft fine film grain, gentle highlight roll-off, no HDR,
no oversaturation. Candid and unposed, photorealistic, high detail. No text,
letters, words, numbers, watermarks, logos or user interface anywhere in the
image, and nothing readable on any screen or paper. Avoid deformed hands, extra
fingers, plastic airbrushed skin, and anyone smiling at the camera.
```
