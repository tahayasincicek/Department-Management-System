import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import './SinavProgrami.css';

const SinavProgrami = ({ role }) => {
    const [sinavlar, setSinavlar] = useState([]);
    const [dersler, setDersler] = useState([]);
    const [form, setForm] = useState({ ders_id: '', tarih: '', saat: '', gozcu: '' });
    const [ogrenciNotListesi, setOgrenciNotListesi] = useState([]);
    const [secilenDersId, setSecilenDersId] = useState('');
    const [editRow, setEditRow] = useState(null);
    const [editData, setEditData] = useState({ tarih: '', saat: '', gozcu: '' });
    const [onayMesaji, setOnayMesaji] = useState('');

    const token = localStorage.getItem('token');

    const fetchSinavlar = useCallback(() => {
        const url = role === 'ogretim_elemani'
            ? 'http://localhost:3001/api/sinav-programi/ogretim'
            : 'http://localhost:3001/api/sinav-programi';

        axios.get(url, {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(res => setSinavlar(res.data))
            .catch(() => alert('Sınav verileri alınamadı.'));
    }, [role, token]);

    const fetchDersler = useCallback(() => {
        axios.get('http://localhost:3001/dersler', {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(res => setDersler(res.data))
            .catch(() => alert('Dersler alınamadı.'));
    }, [token]);

    const fetchOgrenciler = useCallback(async (dersId) => {
        try {
            const res = await axios.get(`http://localhost:3001/api/ogrenci-ders/${dersId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!Array.isArray(res.data)) throw new Error('Yanıtta beklenmeyen format');
            setOgrenciNotListesi(res.data);
        } catch (err) {
            console.error('Öğrenciler alınamadı:', err);
            alert('Öğrenciler alınamadı');
        }
    }, [token]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await axios.post('http://localhost:3001/api/sinav-programi', form, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setForm({ ders_id: '', tarih: '', saat: '', gozcu: '' });
            fetchSinavlar();
        } catch {
            alert('Sınav eklenemedi.');
        }
    };

    const handleApprove = async (id) => {
        try {
            await axios.put(`http://localhost:3001/api/sinav-programi/${id}/onayla`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setOnayMesaji('✅ Sınav başarıyla onaylandı.');
            setTimeout(() => setOnayMesaji(''), 3000);
            fetchSinavlar();
        } catch {
            alert('Sınav onaylanamadı.');
        }
    };

    const handleUpdate = async (id) => {
        try {
            await axios.put(`http://localhost:3001/api/sinav-programi/${id}`, editData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setEditRow(null);
            fetchSinavlar();
        } catch {
            alert('Sınav güncellenemedi.');
        }
    };

    useEffect(() => {
        fetchSinavlar();
        fetchDersler();
    }, [fetchSinavlar, fetchDersler]);

    useEffect(() => {
        if (secilenDersId) {
            fetchOgrenciler(secilenDersId);
        }
    }, [secilenDersId, fetchOgrenciler]);

    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        const gun = String(date.getDate()).padStart(2, '0');
        const ay = String(date.getMonth() + 1).padStart(2, '0');
        const yil = date.getFullYear();
        return `${gun}.${ay}.${yil}`;
    };

    const formatTime = (timeStr) => {
        if (!timeStr) return '—';
        const [saat, dakika] = timeStr.split(':');
        return `${saat}:${dakika}`;
    };

    return (
        <div className="sinavp-container">
            <h2>Sınav Programı</h2>

            {onayMesaji && (
                <div className="onay-bildirimi">{onayMesaji}</div>
            )}

            {(role === 'sekreter' || role === 'bolum_baskani') && (
                <form onSubmit={handleSubmit}>
                    <select
                        value={form.ders_id}
                        onChange={e => setForm({ ...form, ders_id: e.target.value })}
                        required
                    >
                        <option value="">Ders Seç</option>
                        {dersler.map(d => (
                            <option key={d.id} value={d.id}>
                                {d.isim} - {d.ogretmen}
                            </option>
                        ))}
                    </select>
                    <input type="date" value={form.tarih} onChange={e => setForm({ ...form, tarih: e.target.value })} required />
                    <input type="time" value={form.saat} onChange={e => setForm({ ...form, saat: e.target.value })} required />
                    <input type="text" placeholder="Gözetmen" value={form.gozcu} onChange={e => setForm({ ...form, gozcu: e.target.value })} required />
                    <button type="submit">Sınav Ekle</button>
                </form>
            )}

            <table className="sinavp-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Ders</th>
                        <th>Tarih</th>
                        <th>Saat</th>
                        <th>Gözetmen</th>
                        {role === 'bolum_baskani' && <th>İşlemler</th>}
                    </tr>
                </thead>
                <tbody>
                    {sinavlar.map(s => (
                        <tr key={s.id}>
                            <td>{s.id}</td>
                            <td>{s.ders_adi}</td>
                            <td>{editRow === s.id ? <input type="date" value={editData.tarih} onChange={e => setEditData({ ...editData, tarih: e.target.value })} /> : formatDate(s.tarih)}</td>
                            <td>{editRow === s.id ? <input type="time" value={editData.saat} onChange={e => setEditData({ ...editData, saat: e.target.value })} /> : formatTime(s.saat)}</td>
                            <td>{editRow === s.id ? <input type="text" value={editData.gozcu} onChange={e => setEditData({ ...editData, gozcu: e.target.value })} /> : s.gozcu}</td>
                            {role === 'bolum_baskani' && (
                                <td>
                                    {editRow === s.id ? (
                                        <>
                                            <button onClick={() => handleUpdate(s.id)}>Kaydet</button>
                                            <button onClick={() => setEditRow(null)}>İptal</button>
                                        </>
                                    ) : (
                                        <>
                                            <button onClick={() => {
                                                setEditRow(s.id);
                                                setEditData({ tarih: s.tarih.split('T')[0], saat: s.saat, gozcu: s.gozcu });
                                            }}>Güncelle</button>
                                            <button onClick={() => handleApprove(s.id)}>Onayla</button>
                                        </>
                                    )}
                                </td>
                            )}
                        </tr>
                    ))}
                </tbody>
            </table>

            {role === 'ogretim_elemani' && (
                <div className="sinavp-output">
                    <h3>Derse Göre Not Girişi</h3>

                    <select
                        value={secilenDersId}
                        onChange={(e) => {
                            const yeniDersId = e.target.value;
                            setSecilenDersId('');
                            setOgrenciNotListesi([]);
                            setTimeout(() => {
                                setSecilenDersId(yeniDersId);
                            }, 0);
                        }}
                    >
                        <option value="">Ders Seç</option>
                        {sinavlar.map(s => (
                            <option key={s.id} value={s.ders_id}>{s.ders_adi}</option>
                        ))}
                    </select>

                    {ogrenciNotListesi.length > 0 && (
                        <div className="ogrenci-not-listesi">
                            <table className="sinavp-table">
                                <thead>
                                    <tr>
                                        <th>Öğrenci</th>
                                        <th>Numara</th>
                                        <th>Not</th>
                                        <th>Kaydet</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {ogrenciNotListesi.map((ogrenci, index) => (
                                        <tr key={ogrenci.ogrenci_id}>
                                            <td>{ogrenci.ad_soyad}</td>
                                            <td>{ogrenci.ogrenci_no}</td>
                                            <td>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="100"
                                                    value={ogrenci.notu || ''}
                                                    onChange={(e) => {
                                                        const updated = [...ogrenciNotListesi];
                                                        updated[index].notu = e.target.value;
                                                        setOgrenciNotListesi(updated);
                                                    }}
                                                />
                                            </td>
                                            <td>
                                                <button
                                                    type="button"
                                                    onClick={async () => {
                                                        try {
                                                            await axios.put(`http://localhost:3001/api/ogrenci-ders/${ogrenci.id}/not`, {
                                                                notu: ogrenci.notu
                                                            }, {
                                                                headers: { Authorization: `Bearer ${token}` }
                                                            });
                                                            alert('Not kaydedildi.');
                                                        } catch (err) {
                                                            console.error(err);
                                                            alert('Not kaydedilemedi.');
                                                        }
                                                    }}
                                                >
                                                    Kaydet
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default SinavProgrami;
