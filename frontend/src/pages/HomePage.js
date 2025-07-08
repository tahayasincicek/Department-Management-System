import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DersProgrami from '../components/DersProgrami';

function HomePage({ role, handleLogout }) {
    const [activeTab, setActiveTab] = useState('');
    const navigate = useNavigate();

    const renderContent = () => {
        switch (activeTab) {
            case 'ders-programi':
                return <DersProgrami />;
            case 'rol-yonetimi':
                navigate('/rol-yonetimi');
                return null;
            case 'sekreter-paneli':
                return <div><h2>Sekreter Paneli</h2><p>Sekreter işlemleri burada.</p></div>;
            case 'akademik-panel':
                return <div><h2>Akademik Panel</h2><p>Akademik içerikler burada.</p></div>;
            default:
                return <p>Lütfen yukarıdan bir sekme seçin.</p>;
        }
    };

    return (
        <div className="container">
            <header>
                <h1>Öğrenci Bilgi Sistemi</h1>
                <p>Hoşgeldiniz, rolünüz: <strong>{role}</strong></p>
                <button className="logout-btn" onClick={handleLogout}>Çıkış Yap</button>
            </header>

            <nav style={{ marginBottom: '20px' }}>
                <button onClick={() => setActiveTab('ders-programi')}>Ders Programı</button>
                {role === 'bolum_baskani' && (
                    <button onClick={() => setActiveTab('rol-yonetimi')}>Rol Yönetimi</button>
                )}
                {role === 'sekreter' && (
                    <button onClick={() => setActiveTab('sekreter-paneli')}>Sekreter Paneli</button>
                )}
                {(role === 'bolum_baskani' || role === 'ogretim_elemani') && (
                    <button onClick={() => setActiveTab('akademik-panel')}>Akademik Panel</button>
                )}
            </nav>

            {renderContent()}
        </div>
    );
}

export default HomePage;
