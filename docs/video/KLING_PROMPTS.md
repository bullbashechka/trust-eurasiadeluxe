# Промпты для видео квартир

24 отдельные генерации по 3 секунды. Kling 3, 1080p — выбранные пользователем настройки. По указанной цене 15 токенов: всего 360 токенов.

## Как пользоваться

1. Загрузи указанное фото как исходное изображение для отдельного видео.
2. Выставь 3 секунды и 1080p. Сохраняй исходное соотношение сторон, если интерфейс позволяет: фотографии примерно 16:11. Не растягивай фото под 16:9.
3. Скопируй весь английский промпт под кадром. Каждый блок самодостаточный.
4. Скачай оригинальный результат в общую папку `vids/` в корне проекта с указанным именем. Номера относятся к фото; окончательный порядок монтажа определим при сборке.
5. Сначала проверь один клип: не меняются ли мебель, проёмы, зеркала и свет. Промпт задаёт пожелания, но не гарантирует точного сохранения геометрии. Затем запускай остальные.

Встроенные подписи не нужны: их добавим на сайте. Отдельный конечный кадр для этих промптов не требуется. Движение намеренно небольшое, чтобы сохранить интерьер.

## Кадры с приближением — без генерации

Не загружай в Kling `36-67/photos/warm-modern-v1/05-loggia.png` и `39-87/photos/photorealistic/05-loggia.png` (пути относительно `assets/apartments/`). Для них при монтаже сделаем приближение 100% → 105% за 3 секунды. Лоджия 79,79 м² исключена из подборки. Для `36-67/photos/warm-modern-v1/08-hallway-reverse.png` также сделаем приближение 100% → 105% за 3 секунды без AI; итоговое имя — `vids/36-67__08-hallway-reverse.mp4`.

## Квартира 36,67 м² — 6 клипов

### 01. Прихожая от входа

Фото: [01-hallway-entry.png](../../assets/apartments/36-67/photos/warm-modern-v1/01-hallway-entry.png)

Сохранить как: `vids/36-67__01-hallway-entry.mp4`

```text
Use the uploaded image as the exact first frame and visual reference. One continuous 3-second photorealistic architectural shot. Move very slowly straight forward along the hallway, stopping well before any doorway. Keep the kitchen ahead, living room on the left and bathroom on the right in their original positions. Camera motion is tiny, smooth and constant, with no acceleration, pan, tilt, roll, orbit, cuts or transitions. Keep the original lens, camera height, room proportions, straight walls, furniture, materials and object positions unchanged. Only the camera moves; all objects, doors, curtains and exterior scenery remain still. Maintain the original lighting, exposure, colors and sharp focus. No new objects, people, camera reflections, text or logos. No warping, morphing, flicker or geometry changes. Do not reveal unseen areas or pass through furniture or walls.
```

### 02. Санузел

Фото: [02-bathroom.png](../../assets/apartments/36-67/photos/warm-modern-v1/02-bathroom.png)

Сохранить как: `vids/36-67__02-bathroom.mp4`

```text
Use the uploaded image as the exact first frame and visual reference. One continuous 3-second photorealistic architectural shot. Make a barely perceptible straight push forward. Preserve the toilet on the left, floating vanity in the middle and bathtub on the right. Keep the mirror reflection consistent and all taps off. Camera motion is tiny, smooth and constant, with no acceleration, pan, tilt, roll, orbit, cuts or transitions. Keep the original lens, camera height, room proportions, straight walls, furniture, materials and object positions unchanged. Only the camera moves; all objects, doors, curtains and exterior scenery remain still. Maintain the original lighting, exposure, colors and sharp focus. No new objects, people, camera reflections, text or logos. No warping, morphing, flicker or geometry changes. Do not reveal unseen areas or pass through furniture or walls.
```

### 03. Гостиная к окну

Фото: [03-living-room.png](../../assets/apartments/36-67/photos/warm-modern-v1/03-living-room.png)

Сохранить как: `vids/36-67__03-living-room.mp4`

```text
Use the uploaded image as the exact first frame and visual reference. One continuous 3-second photorealistic architectural shot. Glide very slowly forward toward the seating area, stopping before the coffee table. Preserve the cream sectional sofa on the left, stone coffee table and window ahead. Camera motion is tiny, smooth and constant, with no acceleration, pan, tilt, roll, orbit, cuts or transitions. Keep the original lens, camera height, room proportions, straight walls, furniture, materials and object positions unchanged. Only the camera moves; all objects, doors, curtains and exterior scenery remain still. Maintain the original lighting, exposure, colors and sharp focus. No new objects, people, camera reflections, text or logos. No warping, morphing, flicker or geometry changes. Do not reveal unseen areas or pass through furniture or walls.
```

### 04. Кухня к лоджии

Фото: [04-kitchen.png](../../assets/apartments/36-67/photos/warm-modern-v1/04-kitchen.png)

Сохранить как: `vids/36-67__04-kitchen.mp4`

```text
Use the uploaded image as the exact first frame and visual reference. One continuous 3-second photorealistic architectural shot. Make a very subtle forward camera move. Preserve the rectangular dining table in the foreground, cabinets on the right and glazing ahead. Do not approach or pass through the table. Camera motion is tiny, smooth and constant, with no acceleration, pan, tilt, roll, orbit, cuts or transitions. Keep the original lens, camera height, room proportions, straight walls, furniture, materials and object positions unchanged. Only the camera moves; all objects, doors, curtains and exterior scenery remain still. Maintain the original lighting, exposure, colors and sharp focus. No new objects, people, camera reflections, text or logos. No warping, morphing, flicker or geometry changes. Do not reveal unseen areas or pass through furniture or walls.
```

### 06. Гостиная, обратный ракурс

Фото: [06-living-reverse-v5.png](../../assets/apartments/36-67/photos/warm-modern-v1/06-living-reverse-v5.png)

Сохранить как: `vids/36-67__06-living-reverse-v5.mp4`

```text
Use the uploaded image as the exact first frame and visual reference. One continuous 3-second photorealistic architectural shot. Slide the camera only a few centimeters to the right at a constant slow speed. Preserve the TV and low cabinet on the left, open doorway in the middle and oak wardrobe on the right. The TV stays black. Camera motion is tiny, smooth and constant, with no acceleration, pan, tilt, roll, orbit, cuts or transitions. Keep the original lens, camera height, room proportions, straight walls, furniture, materials and object positions unchanged. Only the camera moves; all objects, doors, curtains and exterior scenery remain still. Maintain the original lighting, exposure, colors and sharp focus. No new objects, people, camera reflections, text or logos. No warping, morphing, flicker or geometry changes. Do not reveal unseen areas or pass through furniture or walls.
```

### 07. Кухня, обратный ракурс

Фото: [07-kitchen-reverse.png](../../assets/apartments/36-67/photos/warm-modern-v1/07-kitchen-reverse.png)

Сохранить как: `vids/36-67__07-kitchen-reverse.mp4`

```text
Use the uploaded image as the exact first frame and visual reference. One continuous 3-second photorealistic architectural shot. Make a barely perceptible forward push. Preserve the dining table and bowl in the foreground, kitchen cabinetry on the left and doorway on the right. Stay clear of the table and keep the door fixed. Camera motion is tiny, smooth and constant, with no acceleration, pan, tilt, roll, orbit, cuts or transitions. Keep the original lens, camera height, room proportions, straight walls, furniture, materials and object positions unchanged. Only the camera moves; all objects, doors, curtains and exterior scenery remain still. Maintain the original lighting, exposure, colors and sharp focus. No new objects, people, camera reflections, text or logos. No warping, morphing, flicker or geometry changes. Do not reveal unseen areas or pass through furniture or walls.
```

## Квартира 39,87 м² — 6 клипов

### 01. Прихожая от входа

Фото: [01-hallway-entry.png](../../assets/apartments/39-87/photos/photorealistic/01-hallway-entry.png)

Сохранить как: `vids/39-87__01-hallway-entry.mp4`

```text
Use the uploaded image as the exact first frame and visual reference. One continuous 3-second photorealistic architectural shot. Move very slowly straight forward along the hallway, stopping before the doorway. Preserve the bathroom on the left, round kitchen table ahead and living room on the right. Camera motion is tiny, smooth and constant, with no acceleration, pan, tilt, roll, orbit, cuts or transitions. Keep the original lens, camera height, room proportions, straight walls, furniture, materials and object positions unchanged. Only the camera moves; all objects, doors, curtains and exterior scenery remain still. Maintain the original lighting, exposure, colors and sharp focus. No new objects, people, camera reflections, text or logos. No warping, morphing, flicker or geometry changes. Do not reveal unseen areas or pass through furniture or walls.
```

### 02. Санузел

Фото: [02-bathroom-v2.png](../../assets/apartments/39-87/photos/photorealistic/02-bathroom-v2.png)

Сохранить как: `vids/39-87__02-bathroom-v2.mp4`

```text
Use the uploaded image as the exact first frame and visual reference. One continuous 3-second photorealistic architectural shot. Make a barely perceptible straight push forward. Preserve the bathtub on the left, shower fittings, floating vanity and mirror on the right. Keep all taps off and reflections consistent. Camera motion is tiny, smooth and constant, with no acceleration, pan, tilt, roll, orbit, cuts or transitions. Keep the original lens, camera height, room proportions, straight walls, furniture, materials and object positions unchanged. Only the camera moves; all objects, doors, curtains and exterior scenery remain still. Maintain the original lighting, exposure, colors and sharp focus. No new objects, people, camera reflections, text or logos. No warping, morphing, flicker or geometry changes. Do not reveal unseen areas or pass through furniture or walls.
```

### 03. Гостиная к окну

Фото: [03-living-room.png](../../assets/apartments/39-87/photos/photorealistic/03-living-room.png)

Сохранить как: `vids/39-87__03-living-room.mp4`

```text
Use the uploaded image as the exact first frame and visual reference. One continuous 3-second photorealistic architectural shot. Glide very slowly forward toward the seating area, stopping before the coffee table. Preserve the cream sectional sofa on the right, stone coffee table and window on the left. Camera motion is tiny, smooth and constant, with no acceleration, pan, tilt, roll, orbit, cuts or transitions. Keep the original lens, camera height, room proportions, straight walls, furniture, materials and object positions unchanged. Only the camera moves; all objects, doors, curtains and exterior scenery remain still. Maintain the original lighting, exposure, colors and sharp focus. No new objects, people, camera reflections, text or logos. No warping, morphing, flicker or geometry changes. Do not reveal unseen areas or pass through furniture or walls.
```

### 04. Кухня к окну

Фото: [04-kitchen.png](../../assets/apartments/39-87/photos/photorealistic/04-kitchen.png)

Сохранить как: `vids/39-87__04-kitchen.mp4`

```text
Use the uploaded image as the exact first frame and visual reference. One continuous 3-second photorealistic architectural shot. Make a very subtle straight push forward. Preserve the round oak table and bowl, kitchen cabinets on the left, and window ahead. Keep clear of the table; do not change the number or shape of chairs. Camera motion is tiny, smooth and constant, with no acceleration, pan, tilt, roll, orbit, cuts or transitions. Keep the original lens, camera height, room proportions, straight walls, furniture, materials and object positions unchanged. Only the camera moves; all objects, doors, curtains and exterior scenery remain still. Maintain the original lighting, exposure, colors and sharp focus. No new objects, people, camera reflections, text or logos. No warping, morphing, flicker or geometry changes. Do not reveal unseen areas or pass through furniture or walls.
```

### 06. Гостиная, обратный ракурс

Фото: [06-living-reverse.png](../../assets/apartments/39-87/photos/photorealistic/06-living-reverse.png)

Сохранить как: `vids/39-87__06-living-reverse.mp4`

```text
Use the uploaded image as the exact first frame and visual reference. One continuous 3-second photorealistic architectural shot. Slide the camera only a few centimeters to the left at a constant slow speed. Preserve the sofa on the left, oak wardrobe and doorway ahead, and black TV with low cabinet on the right. Camera motion is tiny, smooth and constant, with no acceleration, pan, tilt, roll, orbit, cuts or transitions. Keep the original lens, camera height, room proportions, straight walls, furniture, materials and object positions unchanged. Only the camera moves; all objects, doors, curtains and exterior scenery remain still. Maintain the original lighting, exposure, colors and sharp focus. No new objects, people, camera reflections, text or logos. No warping, morphing, flicker or geometry changes. Do not reveal unseen areas or pass through furniture or walls.
```

### 07. Кухня, обратный ракурс

Фото: [07-kitchen-reverse.png](../../assets/apartments/39-87/photos/photorealistic/07-kitchen-reverse.png)

Сохранить как: `vids/39-87__07-kitchen-reverse.mp4`

```text
Use the uploaded image as the exact first frame and visual reference. One continuous 3-second photorealistic architectural shot. Make a barely perceptible forward push. Preserve the round dining table in the foreground, kitchen run on the right, oven tower ahead and open doorway on the left. Keep every chair fixed. Camera motion is tiny, smooth and constant, with no acceleration, pan, tilt, roll, orbit, cuts or transitions. Keep the original lens, camera height, room proportions, straight walls, furniture, materials and object positions unchanged. Only the camera moves; all objects, doors, curtains and exterior scenery remain still. Maintain the original lighting, exposure, colors and sharp focus. No new objects, people, camera reflections, text or logos. No warping, morphing, flicker or geometry changes. Do not reveal unseen areas or pass through furniture or walls.
```

## Квартира 79,79 м² — 12 клипов

### 01. Прихожая от входа

Фото: [01-hallway-entry.png](../../assets/apartments/79-79/photorealistic/01-hallway-entry.png)

Сохранить как: `vids/79-79__01-hallway-entry.mp4`

```text
Use the uploaded image as the exact first frame and visual reference. One continuous 3-second photorealistic architectural shot. Move very slowly straight forward along the clear hallway, stopping well before the bathroom doorway. Preserve the long bench and large mirror on the right and all door openings. Camera motion is tiny, smooth and constant, with no acceleration, pan, tilt, roll, orbit, cuts or transitions. Keep the original lens, camera height, room proportions, straight walls, furniture, materials and object positions unchanged. Only the camera moves; all objects, doors, curtains and exterior scenery remain still. Maintain the original lighting, exposure, colors and sharp focus. No new objects, people, camera reflections, text or logos. No warping, morphing, flicker or geometry changes. Do not reveal unseen areas or pass through furniture or walls.
```

### 02. Прихожая к входной двери

Фото: [02-hallway-reverse.png](../../assets/apartments/79-79/photorealistic/02-hallway-reverse.png)

Сохранить как: `vids/79-79__02-hallway-reverse.mp4`

```text
Use the uploaded image as the exact first frame and visual reference. One continuous 3-second photorealistic architectural shot. Make a very subtle straight push toward the closed oak entrance door. Preserve the bench and large mirror on the left. Keep the entrance door closed and reflected architecture consistent. Camera motion is tiny, smooth and constant, with no acceleration, pan, tilt, roll, orbit, cuts or transitions. Keep the original lens, camera height, room proportions, straight walls, furniture, materials and object positions unchanged. Only the camera moves; all objects, doors, curtains and exterior scenery remain still. Maintain the original lighting, exposure, colors and sharp focus. No new objects, people, camera reflections, text or logos. No warping, morphing, flicker or geometry changes. Do not reveal unseen areas or pass through furniture or walls.
```

### 03. Коридор к гостиной

Фото: [03-corridor-entry.png](../../assets/apartments/79-79/photorealistic/03-corridor-entry.png)

Сохранить как: `vids/79-79__03-corridor-entry.mp4`

```text
Use the uploaded image as the exact first frame and visual reference. One continuous 3-second photorealistic architectural shot. Move very slowly forward along the clear corridor, stopping before the doorways. Preserve the bathroom opening ahead on the left and dining room opening on the right. Do not turn into either room. Camera motion is tiny, smooth and constant, with no acceleration, pan, tilt, roll, orbit, cuts or transitions. Keep the original lens, camera height, room proportions, straight walls, furniture, materials and object positions unchanged. Only the camera moves; all objects, doors, curtains and exterior scenery remain still. Maintain the original lighting, exposure, colors and sharp focus. No new objects, people, camera reflections, text or logos. No warping, morphing, flicker or geometry changes. Do not reveal unseen areas or pass through furniture or walls.
```

### 04. Коридор, обратный ракурс

Фото: [04-corridor-reverse.png](../../assets/apartments/79-79/photorealistic/04-corridor-reverse.png)

Сохранить как: `vids/79-79__04-corridor-reverse.mp4`

```text
Use the uploaded image as the exact first frame and visual reference. One continuous 3-second photorealistic architectural shot. Move very slowly straight forward along the clear corridor. Preserve the floating oak shelf, vase and abstract wall art on the right, and the bedroom doorway ahead. Stop before any doorway. Camera motion is tiny, smooth and constant, with no acceleration, pan, tilt, roll, orbit, cuts or transitions. Keep the original lens, camera height, room proportions, straight walls, furniture, materials and object positions unchanged. Only the camera moves; all objects, doors, curtains and exterior scenery remain still. Maintain the original lighting, exposure, colors and sharp focus. No new objects, people, camera reflections, text or logos. No warping, morphing, flicker or geometry changes. Do not reveal unseen areas or pass through furniture or walls.
```

### 05. Гостиная и столовая к окнам

Фото: [05-living-entry.png](../../assets/apartments/79-79/photorealistic/05-living-entry.png)

Сохранить как: `vids/79-79__05-living-entry.mp4`

```text
Use the uploaded image as the exact first frame and visual reference. One continuous 3-second photorealistic architectural shot. Glide very slowly forward into the visible clear floor area between the dining table on the left and seating area on the right. Preserve both windows and the exact arrangement of dining chairs. Camera motion is tiny, smooth and constant, with no acceleration, pan, tilt, roll, orbit, cuts or transitions. Keep the original lens, camera height, room proportions, straight walls, furniture, materials and object positions unchanged. Only the camera moves; all objects, doors, curtains and exterior scenery remain still. Maintain the original lighting, exposure, colors and sharp focus. No new objects, people, camera reflections, text or logos. No warping, morphing, flicker or geometry changes. Do not reveal unseen areas or pass through furniture or walls.
```

### 06. Гостиная и столовая, обратный ракурс

Фото: [06-living-reverse.png](../../assets/apartments/79-79/photorealistic/06-living-reverse.png)

Сохранить как: `vids/79-79__06-living-reverse.mp4`

```text
Use the uploaded image as the exact first frame and visual reference. One continuous 3-second photorealistic architectural shot. Slide the camera only a few centimeters to the left at a constant slow speed. Preserve the sofa and coffee table on the left, long dining table and chairs on the right, and slim pendant light overhead. Camera motion is tiny, smooth and constant, with no acceleration, pan, tilt, roll, orbit, cuts or transitions. Keep the original lens, camera height, room proportions, straight walls, furniture, materials and object positions unchanged. Only the camera moves; all objects, doors, curtains and exterior scenery remain still. Maintain the original lighting, exposure, colors and sharp focus. No new objects, people, camera reflections, text or logos. No warping, morphing, flicker or geometry changes. Do not reveal unseen areas or pass through furniture or walls.
```

### 07. Кухня

Фото: [07-kitchen-entry.png](../../assets/apartments/79-79/photorealistic/07-kitchen-entry.png)

Сохранить как: `vids/79-79__07-kitchen-entry.mp4`

```text
Use the uploaded image as the exact first frame and visual reference. One continuous 3-second photorealistic architectural shot. Make a very subtle straight push forward. Preserve the kitchen run on the left, round dining table ahead, tall cabinets at the back and window on the right. Stop before the table; all chairs remain fixed. Camera motion is tiny, smooth and constant, with no acceleration, pan, tilt, roll, orbit, cuts or transitions. Keep the original lens, camera height, room proportions, straight walls, furniture, materials and object positions unchanged. Only the camera moves; all objects, doors, curtains and exterior scenery remain still. Maintain the original lighting, exposure, colors and sharp focus. No new objects, people, camera reflections, text or logos. No warping, morphing, flicker or geometry changes. Do not reveal unseen areas or pass through furniture or walls.
```

### 09. Спальня к кровати

Фото: [09-bedroom-entry.png](../../assets/apartments/79-79/photorealistic/09-bedroom-entry.png)

Сохранить как: `vids/79-79__09-bedroom-entry.mp4`

```text
Use the uploaded image as the exact first frame and visual reference. One continuous 3-second photorealistic architectural shot. Make a very subtle straight push toward the bed, stopping before its foot. Preserve the upholstered headboard, bedding folds, two bedside tables and lamps, wall artwork and glazing on the left. Camera motion is tiny, smooth and constant, with no acceleration, pan, tilt, roll, orbit, cuts or transitions. Keep the original lens, camera height, room proportions, straight walls, furniture, materials and object positions unchanged. Only the camera moves; all objects, doors, curtains and exterior scenery remain still. Maintain the original lighting, exposure, colors and sharp focus. No new objects, people, camera reflections, text or logos. No warping, morphing, flicker or geometry changes. Do not reveal unseen areas or pass through furniture or walls.
```

### 10. Спальня, обратный ракурс

Фото: [10-bedroom-reverse.png](../../assets/apartments/79-79/photorealistic/10-bedroom-reverse.png)

Сохранить как: `vids/79-79__10-bedroom-reverse.mp4`

```text
Use the uploaded image as the exact first frame and visual reference. One continuous 3-second photorealistic architectural shot. Slide the camera only a few centimeters to the right at a constant slow speed. Preserve the bed in the foreground, wardrobe on the left, doorway in the middle and tall mirror on the right. Keep the mirror reflection consistent. Camera motion is tiny, smooth and constant, with no acceleration, pan, tilt, roll, orbit, cuts or transitions. Keep the original lens, camera height, room proportions, straight walls, furniture, materials and object positions unchanged. Only the camera moves; all objects, doors, curtains and exterior scenery remain still. Maintain the original lighting, exposure, colors and sharp focus. No new objects, people, camera reflections, text or logos. No warping, morphing, flicker or geometry changes. Do not reveal unseen areas or pass through furniture or walls.
```

### 11. Малый санузел

Фото: [11-small-bathroom-entry.png](../../assets/apartments/79-79/photorealistic/11-small-bathroom-entry.png)

Сохранить как: `vids/79-79__11-small-bathroom-entry.mp4`

```text
Use the uploaded image as the exact first frame and visual reference. One continuous 3-second photorealistic architectural shot. Make an extremely subtle straight push forward within this narrow bathroom. Preserve the toilet ahead, small basin and oak cabinet on the right, mirror and tile joints. Do not widen the room; keep taps off. Camera motion is tiny, smooth and constant, with no acceleration, pan, tilt, roll, orbit, cuts or transitions. Keep the original lens, camera height, room proportions, straight walls, furniture, materials and object positions unchanged. Only the camera moves; all objects, doors, curtains and exterior scenery remain still. Maintain the original lighting, exposure, colors and sharp focus. No new objects, people, camera reflections, text or logos. No warping, morphing, flicker or geometry changes. Do not reveal unseen areas or pass through furniture or walls.
```

### 13. Большая ванная

Фото: [13-large-bathroom-entry.png](../../assets/apartments/79-79/photorealistic/13-large-bathroom-entry.png)

Сохранить как: `vids/79-79__13-large-bathroom-entry.mp4`

```text
Use the uploaded image as the exact first frame and visual reference. One continuous 3-second photorealistic architectural shot. Make a barely perceptible straight push forward. Preserve the toilet on the left, bathtub ahead, bronze shower fittings and towel rail on the right. Keep taps and shower off. Camera motion is tiny, smooth and constant, with no acceleration, pan, tilt, roll, orbit, cuts or transitions. Keep the original lens, camera height, room proportions, straight walls, furniture, materials and object positions unchanged. Only the camera moves; all objects, doors, curtains and exterior scenery remain still. Maintain the original lighting, exposure, colors and sharp focus. No new objects, people, camera reflections, text or logos. No warping, morphing, flicker or geometry changes. Do not reveal unseen areas or pass through furniture or walls.
```

### 14. Большая ванная, обратный ракурс

Фото: [14-large-bathroom-reverse.png](../../assets/apartments/79-79/photorealistic/14-large-bathroom-reverse.png)

Сохранить как: `vids/79-79__14-large-bathroom-reverse.mp4`

```text
Use the uploaded image as the exact first frame and visual reference. One continuous 3-second photorealistic architectural shot. Make a barely perceptible straight push forward. Preserve the washing machine with folded towels on the left, small vanity and mirror ahead, and toilet on the right. The washing machine stays off; reflections remain consistent. Camera motion is tiny, smooth and constant, with no acceleration, pan, tilt, roll, orbit, cuts or transitions. Keep the original lens, camera height, room proportions, straight walls, furniture, materials and object positions unchanged. Only the camera moves; all objects, doors, curtains and exterior scenery remain still. Maintain the original lighting, exposure, colors and sharp focus. No new objects, people, camera reflections, text or logos. No warping, morphing, flicker or geometry changes. Do not reveal unseen areas or pass through furniture or walls.
```
