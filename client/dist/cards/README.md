# 스컬킹 카드 이미지

이 폴더에 카드 이미지를 넣으면 게임에서 사용됩니다.

## 파일명 규칙

### 색상 카드 (56장)
- `green_1.png` ~ `green_14.png` (Parrot)
- `purple_1.png` ~ `purple_14.png` (Pirate Map)
- `yellow_1.png` ~ `yellow_14.png` (Treasure Chest)
- `black_1.png` ~ `black_14.png` (Jolly Roger)

### 특수 카드 (14장)
- `pirate.png` (5장 동일 이미지)
- `escape.png` (5장 동일)
- `mermaid.png` (2장 동일)
- `skullking.png` (1장)
- `kraken.png` (1장)
- `whale.png` (1장)

## 이미지 크기 (필수)
**140 × 200 px** (가로 × 세로)

- 모든 카드 이미지는 이 크기로 통일해 주세요.
- 비율이 다르면 `object-fit: cover`로 잘릴 수 있습니다.
- 손패·트릭 영역에서 자동으로 축소 표시됩니다.

## 형식
- PNG, JPG, WebP 지원 (파일명은 .png로 통일)

## 예시
```
cards/
  green_1.png
  green_2.png
  ...
  purple_1.png
  ...
  pirate.png
  escape.png
  mermaid.png
  skullking.png
  kraken.png
  whale.png
```

이미지가 없으면 기존 텍스트/색상 카드가 표시됩니다.
