
export const NAVIGATION_CONFIG = {
    admin: [
        {
            id: 'gym',
            label: 'Зала',
            subLabel: 'Управление на залата',
            icon: 'Gym',
            items: [
                { label: 'Табло', path: '/gym', icon: 'Dashboard' },
                { label: 'Карти', path: '/gym/passes', icon: 'Card' },
                { label: 'Продукти', path: '/products', icon: 'Product' },
                { label: 'Посещения', path: '/gym/visits', icon: 'Clock' },
                { label: 'Катерачи', path: '/climbers', icon: 'User' },
                { label: 'Семейства', path: '/families', icon: 'Team' },
                { label: 'Цени', path: '/gym/prices', icon: 'Tag' },
            ]
        },
        {
            id: 'training',
            label: 'Тренировки',
            subLabel: 'Графици и занимания',
            icon: 'Training',
            items: [
                { label: 'Табло', path: '/training', icon: 'Dashboard' },
                { label: 'Тренировки', path: '/training/sessions', icon: 'Dumbbell' },
                { label: 'График', path: '/sessions/manage', icon: 'Calendar' },
                { label: 'Резервации', path: '/training/bookings', icon: 'Book' },
                { label: 'Катерачи', path: '/training/climbers', icon: 'User' },
                { label: 'Треньори', path: '/team', icon: 'Team' },
                { label: 'Състезания', path: '/competitions/manage', icon: 'Trophy' },
                { label: 'Карти', path: '/training/passes', icon: 'Card' },

                { label: 'Плащания', path: '/finance/reports/coach-fees', icon: 'Money' },
            ]
        },
        {
            id: 'finance',
            label: 'Финанси',
            subLabel: 'Приходи и разходи',
            icon: 'Finance',
            items: [
                { label: 'Финансов дневник', path: '/finance/entries', icon: 'Book' },
                { label: 'Финанси зала', path: '/finance/reports/gym', icon: 'Chart' },
                { label: 'Финанси тренировки', path: '/finance/reports/training', icon: 'Chart' },
            ]
        },
        {
            id: 'settings',
            label: 'Настройки',
            subLabel: 'Системни настройки',
            icon: 'Settings',
            items: [
                { label: 'Цени', path: '/settings/pricing', icon: 'Tag' },
                { label: 'Карти', path: '/settings/cards', icon: 'Card' },
                { label: 'Съобщения', path: '/settings/messages', icon: 'Mail' },
                { label: 'Notifications', path: '/settings/notifications', icon: 'Bell' },
                { label: 'System Settings', path: '/settings/system', icon: 'Cog' },
            ]
        }
    ],
    coach: [
        {
            id: 'gym',
            label: 'Зала',
            subLabel: 'Информация',
            icon: 'Gym',
            items: [
                { label: 'Табло', path: '/gym', icon: 'Dashboard' },
                { label: 'Карти', path: '/gym/passes', icon: 'Card' },
                { label: 'Продукти', path: '/products', icon: 'Product' },
                { label: 'Посещения', path: '/gym/visits', icon: 'Clock' },
                { label: 'Катерачи', path: '/climbers', icon: 'User' },
                { label: 'Семейства', path: '/families', icon: 'Team' },
                { label: 'Цени', path: '/gym/prices', icon: 'Tag' },
            ]
        },
        {
            id: 'training',
            label: 'Тренировки',
            subLabel: 'Графици и занимания',
            icon: 'Training',
            items: [
                { label: 'Табло', path: '/training', icon: 'Dashboard' },
                { label: 'Тренировки', path: '/training/sessions', icon: 'Dumbbell' },
                { label: 'График', path: '/sessions/manage', icon: 'Calendar' },
                { label: 'Резервации', path: '/training/bookings', icon: 'Book' },
                { label: 'Катерачи', path: '/training/climbers', icon: 'User' },
                { label: 'Треньори', path: '/team', icon: 'Team' },
                { label: 'Състезания', path: '/competitions/manage', icon: 'Trophy' },
                { label: 'Карти', path: '/training/passes', icon: 'Card' },

            ]
        }
    ],
    instructor: [
        {
            id: 'gym',
            label: 'Зала',
            subLabel: 'Информация',
            icon: 'Gym',
            items: [
                { label: 'Табло', path: '/gym', icon: 'Dashboard' },
                { label: 'Карти', path: '/gym/passes', icon: 'Card' },
                { label: 'Продукти', path: '/products', icon: 'Product' },
                { label: 'Посещения', path: '/gym/visits', icon: 'Clock' },
                { label: 'Катерачи', path: '/climbers', icon: 'User' },
                { label: 'Семейства', path: '/families', icon: 'Team' },
                { label: 'Цени', path: '/gym/prices', icon: 'Tag' },
            ]
        }
    ],
    climber: [
        // Climber menu is handled via secondary menu in Header.jsx, 
        // but we can keep this for reference or future sidebar usage if needed.
        // Currently empty as per request for horizontal secondary menu.
    ]
};
