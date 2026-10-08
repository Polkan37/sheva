import styles from './Plan.module.css'

export type RoomId =  string;

type PlanProps = {
    activeRoom: RoomId | null
    onRoomHover: (room: RoomId | null) => void
}

export function Plan({ activeRoom, onRoomHover }: PlanProps) {
    const roomHoverHandlers = (room: RoomId) => ({
        onPointerEnter: () => onRoomHover(room),
        onPointerLeave: () => onRoomHover(null),
    })

    const roomClassName = (room: RoomId) =>
        `${styles.room} ${activeRoom === room ? styles.roomActive : ''}`

    return (
        <svg
            className={styles.apartmentPlan}
            viewBox="-80 20 800 450"
            xmlns="http://www.w3.org/2000/svg"
            role="img"
            aria-label="Apartment floor plan"
        >

            // ======================================================
            // INTERACTIVE ROOMS                                      
            // ====================================================== 

            // Room 2 / living room 
            <path
                id="room-living-room"
                className={roomClassName('living-room')}
                data-room="living-room"
                {...roomHoverHandlers('living-room')}
                d="
                    M 48 134
                    L 226 134
                    L 226 420
                    L 48 420
                    Z
                    "
            />

  // Room 3
            <path
                id="room-bedroom"
                className={roomClassName('bedroom')}
                data-room="bedroom"
                {...roomHoverHandlers('bedroom')}
                d="
      M 226 134
      L 410 134
      L 410 340
      L 226 340
      Z
    "
            />

  // Kitchen
            <path
                id="room-kitchen"
                className={roomClassName('kitchen')}
                data-room="kitchen"
                {...roomHoverHandlers('kitchen')}
                d="
      M 410 134
      L 584 134
      L 584 240
      L 493 240
      L 493 270
      L 410 270
      Z
    "
            />

  // Hall
            <path
                id="room-hall"
                className={roomClassName('hall')}
                data-room="hall"
                {...roomHoverHandlers('hall')}
                d="
      M 226 340
      L 410 340
      L 410 270
      L 493 270
      L 493 420
      L 226 420
      Z
    "
            />

  // WC
            <path
                id="room-wc"
                className={roomClassName('wc')}
                data-room="wc"
                {...roomHoverHandlers('wc')}
                d="
      M 493 270
      L 584 270
      L 584 326
      L 493 326
      Z
    "
            />

  // Bathroom
            <path
                id="room-bathroom"
                className={roomClassName('bathroom')}
                data-room="bathroom"
                {...roomHoverHandlers('bathroom')}
                d="
      M 493 326
      L 584 326
      L 584 420
      L 493 420
      Z
    "
            />

  // Balcony / loggia
            <path
                id="room-balcony"
                className={roomClassName('balcony')}
                data-room="balcony"
                {...roomHoverHandlers('balcony')}
                d="
      M 50 46
      L 410 46
      L 410 130
      L 50 130
      Z
    "
            />

  // ======================================================
            // OUTER WALLS                                            
            // ====================================================== 

            <path
                className={styles.wall}
                d="
      M 48 134
      L 584 134

      M 584 134
      L 584 420

      M 584 420
      L 48 420

      M 48 420
      L 48 134
    "
            />

  // ======================================================
            // INTERNAL WALLS                                         
            // ====================================================== 

            // Between room 2 and room 3 
            <path
                className={styles.wall}
                d="
      M 226 134
      L 226 332

      M 226 332
      L 226 420
    "
            />

  // Bedroom / kitchen
            <path
                className={styles.wall}
                d="
      M 410 134
      L 410 340
    "
            />

  // Bedroom / hall
            <path
                className={styles.wall}
                d="
      M 226 342
      L 410 342
    "
            />

  // Kitchen / service zone
            <path
                className={styles.wall}
                d="
      M 410 270
      L 493 270

      M 493 240
      L 584 240
    "
            />

  // Hall / WC + bathroom
            <path
                className={styles.wall}
                d="
      M 493 240
      L 493 352

      M 493 352
      L 493 420
    "
            />

  // WC / bathroom
            <path
                className={styles.wall}
                d="
      M 493 270
      L 584 270

      M 493 330
      L 584 330
    "
            />


  // ======================================================
            // BALCONY / EXTERIOR                                     
            // ====================================================== 

            <path
                className={styles.wall}
                d="
      M 48 130
      L 48 46

      M 48 46
      L 410 46

      M 410 46
      L 410 130
    "
            />

  // balcony division
            <path
                className={styles.wallThin}
                d="
      M 225 46
      L 225 60

      M 225 120
      L 225 130
    "
            />

  // ======================================================
            // WINDOWS                                                
            // ====================================================== 

            // Living room 
            <g className={styles.window}>
                <line x1="77" y1="126" x2="158" y2="126" />
                <line x1="77" y1="130" x2="158" y2="130" />
            </g>

  // Bedroom
            <g className={styles.window}>
                <line x1="260" y1="126" x2="360" y2="126" />
                <line x1="260" y1="130" x2="360" y2="130" />
            </g>

  // Kitchen
            <g className={styles.window}>
                <line x1="445" y1="126" x2="540" y2="126" />
                <line x1="445" y1="130" x2="540" y2="130" />
            </g>



  // ======================================================
            // LABELS                                                 
            // ====================================================== 

            <g>
                <text
                    x="137"
                    y="254"
                    className={styles.label}
                >
                    Вітальня
                </text>
            </g>

            <g>
                <text
                    x="318"
                    y="220"
                    className={styles.label}
                >
                    Спальня
                </text>
            </g>

            <g>
                <text
                    x="493"
                    y="203"
                    className={styles.label}
                >
                    Кухня
                </text>
            </g>

            <g>
                <text
                    x="363"
                    y="377"
                    className={styles.label}
                >
                    Коридор
                </text>
            </g>

            <g>
                <text
                    x="532"
                    y="300"
                    className={`${styles.label} ${styles.labelSmall}`}
                >
                    Туалет
                </text>
            </g>

            <g>
                <text
                    x="532"
                    y="375"
                    className={`${styles.label} ${styles.labelSmall}`}
                >
                    Ванна
                </text>
            </g>
            <g>
                <text
                    x="200"
                    y="90"
                    className={`${styles.label} ${styles.labelSmall}`}
                >
                    Балкон
                </text>
            </g>

        </svg>
    )
}
