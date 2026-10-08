import styles from "./YasnoCard.module.css";

export function getSlotInfo(type: string) {
    switch (type) {
        case "Definite":
            return {
                label: "Немає світла",
                className: styles.disabled,
            };

        case "NotPlanned":
            return {
                label: "Світло є",
                className: styles.available,
            };

        default:
            return {
                label: "Можливе відключення",
                className: styles.maybe,
            };
    }
}