import styles from "./YasnoCard.module.css";

type Status = {

    key: string,
    message: string,
    description: string | null,
    styleClass: string | null
}


type Props = {
    status: Status | undefined;
};

export default function ScheduleCardInfo({status}: Props) {
    if (!status) return null;

    return (
        <div className={`${styles.info} ${status.styleClass}`}>
            <div className={styles.periodContent}>
                <div className={styles.message}>
                    {status.message}
                </div>
                <div className={styles.description}>
                    {status.description}
                </div>
            </div>
        </div>
    );
}