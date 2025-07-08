const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = 3001;
const SECRET_KEY = 'supersecretkey';

app.use(cors());
app.use(express.json());

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'yeni_sifren', // kendi şifreni yaz
    database: 'ders_programi'
});

db.connect(err => {
    if (err) {
        console.error('MySQL bağlantı hatası:', err);
        return;
    }
    console.log('MySQL bağlantısı başarılı');
});

//  Giriş (veritabanı üzerinden)
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    db.query('SELECT * FROM kullanicilar WHERE LOWER(kullanici_adi) = LOWER(?)', [username], async (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.status(401).json({ message: 'Kullanıcı bulunamadı' });

        const user = results[0];
        const match = await bcrypt.compare(password, user.sifre);

        if (!match) return res.status(401).json({ message: 'Şifre hatalı' });

        const token = jwt.sign({ username: user.kullanici_adi, role: user.rol }, SECRET_KEY, { expiresIn: '2h' });
        res.json({ token, role: user.rol, username: user.kullanici_adi });
    });
});

// JWT middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
}

// Rol kontrol middleware
function authorizeRoles(...allowedRoles) {
    return (req, res, next) => {
        const userRole = req.user.role;
        if (!allowedRoles.includes(userRole)) {
            return res.status(403).json({ message: 'Erişim reddedildi: yetkisiz rol' });
        }
        next();
    };
}

// Rol bazlı paneller
app.get('/api/panel/baskan', authenticateToken, authorizeRoles('bolum_baskani'), (req, res) => {
    res.json({ message: 'Bu sayfa sadece Bölüm Başkanı içindir.' });
});

app.get('/api/panel/sekreter', authenticateToken, authorizeRoles('sekreter'), (req, res) => {
    res.json({ message: 'Bu sayfa sadece Sekreter içindir.' });
});

app.get('/api/panel/akademik', authenticateToken, authorizeRoles('bolum_baskani', 'ogretim_elemani'), (req, res) => {
    res.json({ message: 'Bu sayfa sadece Akademik Personel içindir.' });
});

// Ders ekle (kapasite otomatik çekilir)
app.post('/dersler', authenticateToken, authorizeRoles('sekreter', 'bolum_baskani'), (req, res) => {
    const { isim, gun, saat, derslik, ogretmen, sinif } = req.body;

    db.query('SELECT kapasite FROM derslikler WHERE ad = ?', [derslik], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.status(400).json({ message: 'Derslik bulunamadı' });

        db.query(
            'SELECT * FROM dersler WHERE gun = ? AND saat = ? AND derslik = ?',
            [gun, saat, derslik],
            (err, results) => {
                if (err) return res.status(500).json({ error: err.message });
                if (results.length > 0) {
                    return res.status(400).json({ message: 'Bu derslikte bu gün ve saatte başka bir ders var!' });
                }

                db.query(
                    'INSERT INTO dersler (isim, gun, saat, derslik, ogretmen, sinif) VALUES (?, ?, ?, ?, ?, ?)',
                    [isim, gun, saat, derslik, ogretmen, sinif],
                    (err, result) => {
                        if (err) return res.status(500).json({ error: err.message });
                        res.status(201).json({ id: result.insertId });
                    }
                );
            }
        );
    });
});

// Ders işlemleri
app.get('/dersler', authenticateToken, (req, res) => {
    db.query('SELECT * FROM dersler', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.delete('/dersler/:id', authenticateToken, authorizeRoles('sekreter', 'bolum_baskani'), (req, res) => {
    db.query('DELETE FROM dersler WHERE id = ?', [req.params.id], err => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Ders silindi' });
    });
});

app.put('/dersler/:id', authenticateToken, authorizeRoles('sekreter', 'bolum_baskani'), (req, res) => {
    const { isim, gun, saat, derslik, ogretmen, sinif } = req.body;
    db.query(
        'UPDATE dersler SET isim=?, gun=?, saat=?, derslik=?, ogretmen=?, sinif=? WHERE id=?',
        [isim, gun, saat, derslik, ogretmen, sinif, req.params.id],
        err => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Ders güncellendi' });
        }
    );
});

app.put('/api/dersler/:id/ogrenci-sayisi', authenticateToken, (req, res) => {
    db.query('UPDATE dersler SET ogrenciSayisi = ? WHERE id = ?', [req.body.ogrenciSayisi, req.params.id], err => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Öğrenci sayısı güncellendi.' });
    });
});

// Kullanıcıları listele ve rol güncelle
app.get('/api/kullanicilar', authenticateToken, authorizeRoles('bolum_baskani'), (req, res) => {
    db.query('SELECT kullanici_adi, rol FROM kullanicilar', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.put('/api/kullanicilar/:username/rol', authenticateToken, authorizeRoles('bolum_baskani'), (req, res) => {
    const { username } = req.params;
    const { role } = req.body;

    db.query('UPDATE kullanicilar SET rol = ? WHERE kullanici_adi = ?', [role, username], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
        }
        res.json({ message: `${username} adlı kullanıcının rolü ${role} olarak güncellendi.` });
    });
});

// Derslik işlemleri
app.get('/api/derslikler', authenticateToken, (req, res) => {
    db.query('SELECT DISTINCT derslik FROM dersler', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results.map(r => r.derslik));
    });
});

app.get('/api/derslikler/:derslik/dersler', authenticateToken, (req, res) => {
    db.query('SELECT * FROM dersler WHERE derslik = ?', [req.params.derslik], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.get('/api/derslik-kapasiteleri', authenticateToken, (req, res) => {
    db.query('SELECT ad, kapasite FROM derslikler', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// Sınav işlemleri
// Sınav işlemleri – ÇAKIŞMA KONTROLLÜ
app.post('/api/sinav-programi', authenticateToken, authorizeRoles('sekreter', 'bolum_baskani'), (req, res) => {
    const { ders_id, tarih, saat, gozcu } = req.body;

    // Önce bu derse kayıtlı öğrencileri al
    db.query('SELECT sinif FROM dersler WHERE id = ?', [ders_id], (err, dersSonuc) => {
        if (err) return res.status(500).json({ error: err.message });
        if (dersSonuc.length === 0) return res.status(400).json({ message: 'Ders bulunamadı.' });

        const sinif = dersSonuc[0].sinif;

        // Aynı sınıfa ait başka sınav olup olmadığını kontrol et
        const cakismaQuery = `
            SELECT sp.id FROM sinav_programi sp
            JOIN dersler d ON sp.ders_id = d.id
            WHERE sp.tarih = ? AND sp.saat = ? AND d.sinif = ?
        `;

        db.query(cakismaQuery, [tarih, saat, sinif], (err, cakismaSonuc) => {
            if (err) return res.status(500).json({ error: err.message });

            if (cakismaSonuc.length > 0) {
                return res.status(400).json({ message: `Bu sınıfın aynı anda başka bir sınavı var.` });
            }

            // Çakışma yoksa sınavı ekle
            db.query(
                'INSERT INTO sinav_programi (ders_id, tarih, saat, gozcu) VALUES (?, ?, ?, ?)',
                [ders_id, tarih, saat, gozcu],
                (err, result) => {
                    if (err) return res.status(500).json({ error: err.message });
                    res.status(201).json({ id: result.insertId, message: 'Sınav başarıyla eklendi.' });
                }
            );
        });
    });
});


app.get('/api/sinav-programi', authenticateToken, (req, res) => {
    db.query(
        'SELECT s.id, d.isim AS ders_adi, s.tarih, s.saat, s.gozcu FROM sinav_programi s JOIN dersler d ON s.ders_id = d.id',
        (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(results);
        });
});

app.get('/api/sinav-programi/ogretim', authenticateToken, authorizeRoles('ogretim_elemani'), (req, res) => {
    const ogretmen = req.user.username;
    db.query(
        'SELECT s.id, s.ders_id, d.isim AS ders_adi, s.tarih, s.saat, s.gozcu FROM sinav_programi s JOIN dersler d ON s.ders_id = d.id WHERE d.ogretmen = ?',
        [ogretmen],
        (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(results);
        });
});

app.put('/api/ogrenci-ders/:id/not', authenticateToken, authorizeRoles('ogretim_elemani'), (req, res) => {
    const { id } = req.params;
    const { notu } = req.body;

    db.query(
        'UPDATE ogrenci_ders SET notu = ? WHERE id = ?',
        [notu, id],
        (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            if (result.affectedRows === 0) {
                return res.status(404).json({ message: 'Kayıt bulunamadı' });
            }
            res.json({ message: 'Not güncellendi' });
        }
    );
});

// Öğretim üyesi kendi dersine kayıtlı öğrencileri görebilsin
app.get('/api/ogrenci-ders/:dersId', authenticateToken, authorizeRoles('ogretim_elemani'), (req, res) => {
    const dersId = req.params.dersId;

    db.query(
        'SELECT od.id, o.ad_soyad, o.ogrenci_no, od.notu, od.ogrenci_id FROM ogrenci_ders od JOIN ogrenciler o ON od.ogrenci_id = o.id WHERE od.ders_id = ?',
        [dersId],
        (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(results);
        }
    );
});


//  GÜncellenen Sınav Oturma Düzeni Oluştur 
app.post('/api/sinav-oturma/olustur/:sinavId', authenticateToken, authorizeRoles('bolum_baskani', 'sekreter'), (req, res) => {
    const sinavId = req.params.sinavId;
    const sinif1 = req.body.sinif || 'amfi1';
    const sinif2 = sinif1 === 'amfi1' ? '108' : 'amfi1';

    const sinifDuzenleri = {
        amfi1: { duzen: [4, 3, 4], sira: 9 },
        "108": { duzen: [2, 2, 2, 2], sira: 7 }
    };

    db.query(`
        SELECT s.ders_id, s.gozcu, d.isim AS ders_adi
        FROM sinav_programi s
        JOIN dersler d ON s.ders_id = d.id
        WHERE s.id = ?
    `, [sinavId], (err, sinavResult) => {
        if (err) return res.status(500).json({ error: err.message });
        if (sinavResult.length === 0) return res.status(404).json({ message: 'Sınav bulunamadı' });

        const { ders_id, gozcu, ders_adi } = sinavResult[0];

        db.query(`
            SELECT o.id, o.ad_soyad, o.ogrenci_no
            FROM ogrenciler o
            JOIN ogrenci_ders od ON o.id = od.ogrenci_id
            WHERE od.ders_id = ?
        `, [ders_id], (err, ogrenciler) => {
            if (err) return res.status(500).json({ error: err.message });

            const shuffled = ogrenciler.sort(() => 0.5 - Math.random());

            const plans = {};
            const kapasite1 = sinifDuzenleri[sinif1].duzen.reduce((a, b) => a + b, 0) * sinifDuzenleri[sinif1].sira;
            const kapasite2 = sinifDuzenleri[sinif2].duzen.reduce((a, b) => a + b, 0) * sinifDuzenleri[sinif2].sira;

            const grup1 = shuffled.slice(0, kapasite1);
            const grup2 = shuffled.slice(kapasite1, kapasite1 + kapasite2);

            const buildPlan = (ogrenciler, sinif) => {
                const { duzen, sira } = sinifDuzenleri[sinif];
                let seatingPlan = [];
                let index = 0;
                for (let row = 0; row < sira; row++) {
                    for (let block = 0; block < duzen.length; block++) {
                        for (let col = 0; col < duzen[block]; col++) {
                            if (index < ogrenciler.length) {
                                seatingPlan.push({
                                    ogrenci_id: ogrenciler[index].id,
                                    ogrenci_ad: ogrenciler[index].ad_soyad,
                                    ogrenci_no: ogrenciler[index].ogrenci_no,
                                    sira: row + 1,
                                    blok: block + 1,
                                    koltuk: col + 1
                                });
                                index++;
                            }
                        }
                    }
                }
                return seatingPlan;
            };

            plans[sinif1] = buildPlan(grup1, sinif1);
            if (grup2.length > 0) plans[sinif2] = buildPlan(grup2, sinif2);

            //  VERİTABANINA KAYDETME İŞLEMİ (önce sil, sonra ekle)
            db.query('DELETE FROM sinav_oturma WHERE sinav_id = ?', [sinavId], (err) => {
                if (err) console.error('Önceki oturma verileri silinemedi:', err);
            });

            Object.values(plans).flat().forEach(seat => {
                db.query(
                    'INSERT INTO sinav_oturma (sinav_id, ogrenci_id, sira, kolon) VALUES (?, ?, ?, ?)',
                    [sinavId, seat.ogrenci_id, `${seat.sira}-${seat.blok}`, seat.koltuk],
                    (err) => {
                        if (err) console.error('Kayıt eklenemedi:', err);
                    }
                );
            });

            res.json({
                ders_adi,
                toplam_ogrenci: shuffled.length,
                toplam_kapasite: kapasite1 + kapasite2,
                seatingPlans: plans,
                gozcu: gozcu || 'Tanımsız'
            });
        });
    });
});



// Öğretim elemanı bireysel ders programı (kapı isimliği)
app.get('/api/ogretim-ders-programi', authenticateToken, authorizeRoles('ogretim_elemani'), (req, res) => {
    const ogretmen = req.user.username;

    db.query(
        'SELECT isim AS ders_adi, gun, saat, derslik FROM dersler WHERE ogretmen = ? ORDER BY FIELD(gun, "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma"), saat',
        [ogretmen],
        (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(results);
        }
    );
});

// Öğretim elemanı ders programı oluştur
app.post('/api/ogretim-ders-programi/olustur', authenticateToken, (req, res) => {
    const ogretmen = req.user.username;

    db.query(
        `SELECT isim AS ders_adi, gun, saat, derslik 
         FROM dersler 
         WHERE ogretmen = ? 
         ORDER BY FIELD(gun, 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'), saat`,
        [ogretmen],
        (err, results) => {
            if (err) return res.status(500).json({ error: err.message });

            const program = results.map(ders => ({
                ders_adi: ders.ders_adi,
                gun: ders.gun,
                saat: ders.saat,
                derslik: ders.derslik
            }));

            res.json({ message: 'Ders programı başarıyla oluşturuldu', program });
        }
    );
});


// Bölüm başkanı ve sekreter için tüm öğretim üyelerinin ders programlarını getir
app.post('/api/ogretim-ders-programlari/olustur', authenticateToken, authorizeRoles('bolum_baskani', 'sekreter'), (req, res) => {
    db.query(
        `SELECT ogretmen, isim AS ders_adi, gun, saat, derslik 
         FROM dersler 
         WHERE ogretmen IN (SELECT kullanici_adi FROM kullanicilar WHERE rol = 'ogretim_elemani')
         ORDER BY ogretmen, FIELD(gun, 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'), saat`,
        (err, results) => {
            if (err) return res.status(500).json({ error: err.message });

            const programlar = {};

            results.forEach(ders => {
                if (!programlar[ders.ogretmen]) {
                    programlar[ders.ogretmen] = [];
                }
                programlar[ders.ogretmen].push({
                    ders_adi: ders.ders_adi,
                    gun: ders.gun,
                    saat: ders.saat,
                    derslik: ders.derslik
                });
            });

            res.json({ message: 'Tüm öğretim üyelerinin ders programları oluşturuldu', programlar });
        }
    );
});

// Bölüm başkanı ve sekreter için: tüm öğretim üyelerinin ders programlarını topluca getir
app.post('/api/ogretim-ders-programlari/olustur', authenticateToken, authorizeRoles('bolum_baskani', 'sekreter'), (req, res) => {
    db.query(
        `SELECT d.ogretmen, d.isim AS ders_adi, d.gun, d.saat, d.derslik 
         FROM dersler d
         JOIN kullanicilar k ON d.ogretmen = k.kullanici_adi
         WHERE k.rol = 'ogretim_elemani'
         ORDER BY d.ogretmen, FIELD(d.gun, 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'), d.saat`,
        (err, results) => {
            if (err) return res.status(500).json({ error: err.message });

            const programlar = {};

            results.forEach(ders => {
                if (!programlar[ders.ogretmen]) {
                    programlar[ders.ogretmen] = [];
                }
                programlar[ders.ogretmen].push({
                    ders_adi: ders.ders_adi,
                    gun: ders.gun,
                    saat: ders.saat,
                    derslik: ders.derslik
                });
            });

            res.json({ message: 'Tüm öğretim üyelerinin ders programları başarıyla oluşturuldu', programlar });
        }
    );
});


//  Sınav Onaylama 
app.put('/api/sinav-programi/:id/onayla', authenticateToken, authorizeRoles('bolum_baskani'), (req, res) => {
    const id = req.params.id;
    db.query('UPDATE sinav_programi SET onayli = 1 WHERE id = ?', [id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Sınav onaylandı' });
    });
});

// Sınav Güncelleme 
app.put('/api/sinav-programi/:id', authenticateToken, authorizeRoles('bolum_baskani'), (req, res) => {
    const { tarih, saat, gozcu } = req.body;
    db.query(
        'UPDATE sinav_programi SET tarih = ?, saat = ?, gozcu = ? WHERE id = ?',
        [tarih, saat, gozcu, req.params.id],
        (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Sınav bilgileri güncellendi' });
        }
    );
});

app.post('/api/kullanicilar', authenticateToken, authorizeRoles('sekreter', 'bolum_baskani'), async (req, res) => {
    const { kullanici_adi, sifre, rol } = req.body;

    let finalRol = 'null';
    if (req.user.role === 'bolum_baskani' && rol) {
        finalRol = rol;
    }

    const hashedPassword = await bcrypt.hash(sifre, 10);

    db.query(
        'INSERT INTO kullanicilar (kullanici_adi, sifre, rol) VALUES (?, ?, ?)',
        [kullanici_adi, hashedPassword, finalRol],
        (err, result) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(400).json({ message: 'Bu kullanıcı adı zaten mevcut.' });
                }
                return res.status(500).json({ error: err.message });
            }
            res.status(201).json({ message: 'Kullanıcı başarıyla oluşturuldu.' });
        }
    );
});


app.get('/api/sinav-oturma/:sinavId', authenticateToken, (req, res) => {
    const sinavId = req.params.sinavId;

    const query = `
        SELECT 
            so.ogrenci_id,
            o.ad_soyad AS ogrenci_ad,
            o.ogrenci_no,
            so.sira,
            so.kolon,
            sp.gozcu,
            d.isim AS ders_adi
        FROM sinav_oturma so
        JOIN ogrenciler o ON so.ogrenci_id = o.id
        JOIN sinav_programi sp ON sp.id = so.sinav_id
        JOIN dersler d ON d.id = sp.ders_id
        WHERE so.sinav_id = ?
    `;

    db.query(query, [sinavId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});





// Sunucuyu başlat
app.listen(PORT, () => console.log(`Server ${PORT} portunda çalışıyor`));
