import { formatTime } from "../../../shared/lib/format";
import { isTomorrow } from "../../../shared/lib/isTomorrow";

export function getDescription(
    nextShutdownTime: number | null,
    nextRestoreTime: number | null,
) {
    if (nextShutdownTime && nextRestoreTime) {
        return `Наступне: ${formatTime(nextShutdownTime)} – ${formatTime(nextRestoreTime)}${
            isTomorrow(nextShutdownTime) ? " завтра" : ""
        }`;
    }

    if (nextRestoreTime) {
        return `До ${formatTime(nextRestoreTime)} немає світла`;
    }

    return null;
}