import styles from "./YasnoCard.module.css";

type Status = {

            key: string,
            message: string,
            description: string | null,
            styleClass: string | null
}


type Props = {
    status: Status | null;
};

export default function ScheduleCardInfo({
    status
}: Props) {
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