import { useState } from 'react'
import { NavLink } from 'react-router-dom'

import styles from './Header.module.css'
import icon from '../../assets/home.svg'
import { SquareLibrary, Cog, Menu, X } from 'lucide-react'


export function Header() {
  const [iconSize] = useState(50)
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const closeMenu = () => setIsMenuOpen(false)

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
          <li>
            <NavLink to="/living-room" className={({ isActive }) => isActive ? styles.active : ''}>
              Living room
            </NavLink>
          </li>
          <li>
            <NavLink to="/bedroom" className={({ isActive }) => isActive ? styles.active : ''}>
              Bedroom
            </NavLink>
          </li>
          <li>
            <NavLink to="/bath" className={({ isActive }) => isActive ? styles.active : ''}>
              Bath
            </NavLink>
          </li>
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
          <li>
            <NavLink
              to="/living-room"
              className={({ isActive }) => (isActive ? styles.mobileActive : '')}
              onClick={closeMenu}
            >
              Living room
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/bedroom"
              className={({ isActive }) => (isActive ? styles.mobileActive : '')}
              onClick={closeMenu}
            >
              Bedroom
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/bath"
              className={({ isActive }) => (isActive ? styles.mobileActive : '')}
              onClick={closeMenu}
            >
              Bath
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/devices"
              className={({ isActive }) => (isActive ? styles.mobileActive : '')}
              onClick={closeMenu}
              end
            >
              <SquareLibrary size={20} />
              Devices
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/settings"
              className={({ isActive }) => (isActive ? styles.mobileActive : '')}
              onClick={closeMenu}
              end
            >
              <Cog size={20} />
              Settings
            </NavLink>
          </li>
        </ul>
      </nav>
    </header>
  )
}