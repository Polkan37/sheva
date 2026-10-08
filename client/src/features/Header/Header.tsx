import { useState, type ReactNode } from 'react'
import { NavLink } from 'react-router-dom'

import styles from './Header.module.css'
import icon from '../../assets/home.svg'
import { SquareLibrary, Cog, Menu, X } from 'lucide-react'

import { useRooms } from '../../shared/hooks/useRooms'

type MobileNavItem = {
  id: string | number
  name: string
  slug: string
  icon?: ReactNode
}

export function Header() {
  const [iconSize] = useState(50)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const closeMenu = () => setIsMenuOpen(false)

  const rooms = useRooms();

  const mobileNavList: MobileNavItem[] = [
    ...rooms,
    {
      id: 4124124,
      slug: 'devices',
      name: 'Devices',
      icon: <SquareLibrary size={20} />
    },
    {
      id: 4125555,
      slug: 'settings',
      name: 'Settings',
      icon: <Cog size={20} />
    },
  ]

  return (
    <header className={styles.header}>
      <NavLink className='circle' to="/" end>
        <img
          className="glass-container"
          src={icon}
          width={iconSize}
          height={iconSize}
          alt="logo icon"
        />
      </NavLink>

      <nav className={`${styles.nav} glass-container`}>
        <ul>
          {rooms.map((room) => (
            <li key={`${room.id}${room.slug}`}>
              <NavLink to={`/${room.slug}`} className={({ isActive }) => isActive ? styles.active : ''}>
                {room.name}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className={styles.desktopActions}>
        <NavLink className='circle' to="/devices" title='all devices' end>
          <div className="glass-container round-button">
            <SquareLibrary size={24} />
          </div>
        </NavLink>
        <NavLink className='circle' to="/settings" title='settings' end>
          <div className="glass-container round-button">
            <Cog size={24} />
          </div>
        </NavLink>
      </div>

      <button
        className={`${styles.menuButton} glass-container`}
        type="button"
        aria-label={isMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
        aria-expanded={isMenuOpen}
        aria-controls="mobile-navigation"
        onClick={() => setIsMenuOpen((prev) => !prev)}
      >
        {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      <nav
        id="mobile-navigation"
        className={`${styles.mobileNav} glass-container ${isMenuOpen ? styles.mobileNavOpen : ''
          }`}
        aria-hidden={!isMenuOpen}
      >
        <ul>

          {mobileNavList.map((room) => (
            <li key={room.id}>
              <NavLink
                to={`/${room.slug}`}
                className={({ isActive }) => isActive ? styles.active : ''}
                onClick={closeMenu}>
                {room?.icon && room?.icon}
                {room.name}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  )
}