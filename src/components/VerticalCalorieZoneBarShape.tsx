import type { BarShapeProps } from "recharts";
import { Rectangle } from "recharts";
import {
  CALORIE_ZONE_SEGMENT_FILLS,
  calorieZoneSegments,
  normalizeCalorieTargets,
  type CalorieTargets,
} from "../lib/calories";

const BAR_TOP_RADIUS: [number, number, number, number] = [10, 10, 0, 0];

export function createVerticalCalorieZoneBarShape(targets: CalorieTargets) {
  const zones = calorieZoneSegments(targets);
  const calorieMax = normalizeCalorieTargets(targets).calorieMax;

  return function VerticalCalorieZoneBarShape(props: BarShapeProps) {
    const { x, y, width, height, payload, index } = props;
    if (height <= 0 || width <= 0) return null;

    const calories = Number(payload?.calories ?? 0);
    if (calories <= 0) return null;

    const clipId = `calorie-zone-bar-${index}-${Math.round(x)}`;
    const segments = zones.flatMap((zone) => {
      const from = Math.max(zone.fromKcal, 0);
      const to = Math.min(zone.toKcal, calories);
      if (to <= from) return [];
      const yTop = y + height - (to / calories) * height;
      const segHeight = y + height - (from / calories) * height - yTop;
      return [{ y: yTop, height: segHeight, fill: zone.fill }];
    });

    if (calories > calorieMax) {
      const from = calorieMax;
      const to = calories;
      const yTop = y + height - (to / calories) * height;
      const segHeight = y + height - (from / calories) * height - yTop;
      if (segHeight > 0) {
        segments.push({
          y: yTop,
          height: segHeight,
          fill: CALORIE_ZONE_SEGMENT_FILLS.danger,
        });
      }
    }

    return (
      <g>
        <defs>
          <clipPath id={clipId}>
            <Rectangle
              x={x}
              y={y}
              width={width}
              height={height}
              radius={BAR_TOP_RADIUS}
            />
          </clipPath>
        </defs>
        <g clipPath={`url(#${clipId})`}>
          {segments.map((seg, i) => (
            <rect
              key={i}
              x={x}
              y={seg.y}
              width={width}
              height={seg.height}
              fill={seg.fill}
            />
          ))}
        </g>
      </g>
    );
  };
}
