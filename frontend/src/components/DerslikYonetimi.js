import React, { useEffect, useState } from 'react';
import axios from 'axios';

function DerslikYonetimi() {
    const [derslikler, setDerslikler] = useState([]);
    const [secilen, setSecilen] = useState(null);
    const [dersler, setDersler] = useState([]);
    const [kapasiteler, setKapasiteler] = useState({});
    const [yeniSayilar, setYeniSayilar] = useState({});
    const token = localStorage.getItem("token");

    useEffect(() => {
        axios.get("http://localhost:3001/api/derslikler", {
            headers: { Authorization: `Bearer ${token}` }
        }).then(res => setDerslikler(res.data));

        // Kapasiteleri getir
        axios.get("http://localhost:3001/api/derslik-kapasiteleri", {
            headers: { Authorization: `Bearer ${token}` }
        }).then(res => {
            const kapasitelerMap = {};
            res.data.forEach(k => {
                kapasitelerMap[k.ad] = k.kapasite;
            });
            setKapasiteler(kapasitelerMap);
        });
    }, [token]);

    const dersleriGetir = (derslik) => {
        setSecilen(derslik);
        axios.get(`http://localhost:3001/api/derslikler/${derslik}/dersler`, {
            headers: { Authorization: `Bearer ${token}` }
        }).then(res => setDersler(res.data));
    };

    const guncelleOgrenciSayisi = (id, yeniSayi) => {
        if (!yeniSayi) return alert("Öğrenci sayısı boş olamaz.");
        axios.put(`http://localhost:3001/api/dersler/${id}/ogrenci-sayisi`, {
            ogrenciSayisi: parseInt(yeniSayi)
        }, {
            headers: { Authorization: `Bearer ${token}` }
        }).then(() => {
            alert("Öğrenci sayısı güncellendi");
            dersleriGetir(secilen);
        }).catch(err => {
            alert("Hata: " + err.response?.data?.message || err.message);
        });
    };

    const handleInputChange = (id, value) => {
        setYeniSayilar(prev => ({ ...prev, [id]: value }));
    };

    return (
        <div className="derslik-container">
            <h2>Derslik Yönetimi</h2>
            <ul className="derslik-listesi">
                {derslikler.map((derslik, i) => (
                    <li key={i}>
                        <strong>{derslik}</strong>
                        <button onClick={() => dersleriGetir(derslik)}>Dersleri Gör</button>
                    </li>
                ))}
            </ul>

            {secilen && (
                <div className="ders-listesi">
                    <h3>{secilen} Derslikteki Dersler</h3>
                    <ul>
                        {dersler.map((d, i) => {
                            const yeniSayi = yeniSayilar[d.id] ?? d.ogrenciSayisi ?? 0;
                            const kapasite = kapasiteler[d.derslik] ?? 0;
                            const kapasiteAsildi = parseInt(yeniSayi) > kapasite;

                            return (
                                <li key={i}>
                                    <div>
                                        <strong>{d.isim}</strong> - {d.gun} {d.saat} - {d.ogretmen} - Sınıf: {d.sinif}<br />
                                        📅 Tarih: {d.tarih ?? 'Yok'}<br />
                                        👥 Mevcut: {d.ogrenciSayisi ?? 0} / Kapasite: {kapasite}
                                    </div>

                                    <div style={{ marginTop: "5px" }}>
                                        {kapasiteAsildi ? (
                                            <span style={{ color: 'red' }}>❌ Yeni sayı kapasiteyi aşıyor!</span>
                                        ) : (
                                            <span style={{ color: 'green' }}>✅ Uygun</span>
                                        )}
                                    </div>

                                    <input
                                        type="number"
                                        min="0"
                                        value={yeniSayi}
                                        onChange={(e) => handleInputChange(d.id, e.target.value)}
                                        style={{ marginTop: "8px", marginRight: "10px" }}
                                    />

                                    <button
                                        onClick={() => guncelleOgrenciSayisi(d.id, yeniSayi)}
                                        disabled={kapasiteAsildi}
                                    >
                                        Kaydet
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}
        </div>
    );
}

export default DerslikYonetimi;
