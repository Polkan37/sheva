import type { YasnoIntegration } from "../../../entities/Integration/types";

import ScheduleCardInfo from "./ScheduleCardInfo";
import { getDescription } from "./getDescription";

import { formatDateTimeNumbers, formatMinutes, formatScheduleDate } from "../../../shared/lib/format";
import { getSlotInfo } from "./getSlotInfo";

import styles from "./YasnoCard.module.css";

type Props = { integration: YasnoIntegration; };

export default function YasnoCard({ integration }: Props) {
    const { provider, group, status, schedule, lastSyncAt, nextRestoreTime, nextShutdownTime } = integration;

    const statusList = [
        {
            key: "NoOutages",
            message: "Без відключень",
            description: "весь день, цілий день, світло є",
            styleClass: styles.available
        },
        {
            key: "ScheduleApplies",
            message: "Діють графіки відключень",
            description: getDescription(nextShutdownTime, nextRestoreTime),
            styleClass: styles.disabled
        },
        {
            key: "PossibleShutdowns",
            message: "Можливі відключення",   //не було такого статусу, але в графіках такі відмітки бували
            description: getDescription(nextShutdownTime, nextRestoreTime),
            styleClass: styles.maybe
        },
        {
            key: "EmergencyShutdowns",
            message: "Екстренні відключення",
            description: "Графіки наразі не діють",
            styleClass: styles.disabled
        },
    ];
    const statusDetails = statusList.find(mess => mess.key === status);

    return (
        <>
            <div className={styles.scheduleCard}>
                <div className={styles.rightSide}>
                    <div className={styles.header}>
                        <h3 className={styles.title}>
                            <span className={styles.outageIcon}>⚡</span>
                            {provider}
                        </h3>

                        <span className={styles.group}>
                            Черга {group}
                        </span>
                    </div>

                    <ScheduleCardInfo status={statusDetails} />

                    <div className={styles.footer}>
                        <span className={styles.updated}>
                            Оновлено: {formatDateTimeNumbers(lastSyncAt)}
                        </span>

                    </div>
                </div>

                {status !== "EmergencyShutdowns" && status !== "NoOutages" ? (
                    <div className={styles.leftSide}>
                        <div className={styles.title}>
                            Сьогодні, {formatScheduleDate(schedule.today.date)}
                        </div>

                        <div className={styles.schedule}>
                            {schedule.today.slots.map((slot) => {
                                const { label, className } = getSlotInfo(slot.type);

                                return (
                                    <div
                                        key={`${slot.start}-${slot.end}`}
                                        className={`${styles.period} ${className}`}
                                    >
                                        <div className={styles.periodContent}>
                                            <div className={styles.time}>
                                                {formatMinutes(slot.start)} – {formatMinutes(slot.end)}
                                            </div>

                                            <div className={styles.status}>
                                                {label}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : <div>&nbsp;</div>}
            </div>
        </>
    );
}