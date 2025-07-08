import React from 'react';
import { useNavigate } from 'react-router-dom';

function NavBar({ role, handleLogout }) {
    const navigate = useNavigate();

    return (
        <nav className="nav-bar">
            <span className="logo" onClick={() => navigate('/')}>BYS</span>

            {/* ✅ Ders Programı sadece sekreter ve başkana açık */}
            {(role === 'sekreter' || role === 'bolum_baskani') && (
                <button onClick={() => navigate('/ders-programi')}>Ders Programı</button>
            )}

            {(role === 'bolum_baskani' || role === 'sekreter' || role === 'ogretim_elemani') && (
                <button onClick={() => navigate('/sinav-programi')}>Sınav Programı</button>
            )}

            {/* 🔧 Burada öğretim elemanı da görebilmeli */}
            {(role === 'bolum_baskani' || role === 'sekreter' || role === 'ogretim_elemani') && (
                <button onClick={() => navigate('/sinav-oturma')}>Sınav Oturma  Düzeni</button>
            )}

            {role === 'bolum_baskani' && (
                <>
                    <button onClick={() => navigate('/rol-yonetimi')}>Rol Yönetimi</button>
                    <button onClick={() => navigate('/derslik-yonetimi')}>Derslik Yönetimi</button>
                </>
            )}




            {/* ✅ HERKES GÖREBİLİR */}
            <button onClick={() => navigate('/ogretim-ders-programi')}>
                Ders Programım (Kapı İsimliği)
            </button>

            {(role === 'bolum_baskani' || role === 'sekreter') && (
                <>
                    <button onClick={() => navigate('/personel-ders-programi')}>
                        Personel Ders Programları
                    </button>
                    <button onClick={() => navigate('/kullanici-ekle')}>
                        Kullanıcı Ekle
                    </button>
                </>
            )}

            <button className="logout-btn" onClick={handleLogout}>Çıkış Yap</button>
        </nav>
    );
}

export default NavBar;
