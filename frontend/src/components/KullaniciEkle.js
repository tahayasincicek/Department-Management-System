import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './KullaniciEkle.css';

const KullaniciEkle = () => {
    const [kullaniciAdi, setKullaniciAdi] = useState('');
    const [sifre, setSifre] = useState('');
    const [rol, setRol] = useState('ogretim_elemani');
    const [mevcutRol, setMevcutRol] = useState('');
    const [mesaj, setMesaj] = useState('');

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            setMevcutRol(payload.role);
        } catch (err) {
            console.error("Token çözümlenemedi:", err);
        }
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();

        const token = localStorage.getItem('token');
        const yeniKullanici = {
            kullanici_adi: kullaniciAdi,
            sifre: sifre
        };

        // Eğer bölüm başkanıysa rolü belirlesin
        if (mevcutRol === 'bolum_baskani') {
            yeniKullanici.rol = rol;
        }

        try {
            const res = await axios.post('http://localhost:3001/api/kullanicilar', yeniKullanici, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            setMesaj(res.data.message || 'Kullanıcı başarıyla eklendi');
            setKullaniciAdi('');
            setSifre('');
        } catch (err) {
            setMesaj(err.response?.data?.message || 'Hata oluştu');
        }
    };

    if (!mevcutRol) return <p>Yükleniyor...</p>;

    return (
        <div className="kullanici-ekle-container">
            <h2>Kullanıcı Ekle</h2>
            <form onSubmit={handleSubmit}>
                <label>Kullanıcı Adı:</label>
                <input
                    type="text"
                    value={kullaniciAdi}
                    onChange={(e) => setKullaniciAdi(e.target.value)}
                    required
                />

                <label>Şifre:</label>
                <input
                    type="password"
                    value={sifre}
                    onChange={(e) => setSifre(e.target.value)}
                    required
                />

                {mevcutRol === 'bolum_baskani' && (
                    <>
                        <label>Rol Seç:</label>
                        <select value={rol} onChange={(e) => setRol(e.target.value)}>
                            <option value="ogretim_elemani">Öğretim Elemanı</option>
                            <option value="sekreter">Sekreter</option>
                            <option value="bolum_baskani">Bölüm Başkanı</option>
                        </select>
                    </>
                )}

                <button type="submit">Ekle</button>
            </form>

            {mesaj && <p className="mesaj">{mesaj}</p>}
        </div>
    );
};

export default KullaniciEkle;
