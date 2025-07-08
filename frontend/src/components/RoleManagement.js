import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './RoleManagement.css'; // 🎯 CSS dosyasını dahil ettik

function RoleManagement() {
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState('');
    const [newRole, setNewRole] = useState('');

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const res = await axios.get('http://localhost:3001/api/kullanicilar', {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                }
            });
            setUsers(res.data);
        } catch (err) {
            alert('Kullanıcılar alınamadı');
        }
    };

    const updateUserRole = async () => {
        if (!selectedUser || !newRole) {
            alert("Lütfen kullanıcı ve rol seçin.");
            return;
        }

        try {
            const res = await axios.put(
                `http://localhost:3001/api/kullanicilar/${selectedUser}/rol`,
                { role: newRole },
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`
                    }
                }
            );
            alert(res.data.message);
            fetchUsers();
        } catch (err) {
            alert('Rol güncellenemedi');
        }
    };

    return (
        <div className="role-container">
            <h2>Rol Yönetimi</h2>
            <select value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)}>
                <option value="">Kullanıcı seç</option>
                {users.map(user => (
                    <option key={user.kullanici_adi} value={user.kullanici_adi}>
                        {user.kullanici_adi} ({user.rol})
                    </option>
                ))}
            </select>

            <select value={newRole} onChange={(e) => setNewRole(e.target.value)}>
                <option value="">Yeni rol seç</option>
                <option value="sekreter">Sekreter</option>
                <option value="ogretim_elemani">Öğretim Elemanı</option>
                <option value="bolum_baskani">Bölüm Başkanı</option>
            </select>

            <button onClick={updateUserRole}>Rolü Güncelle</button>
        </div>
    );
}

export default RoleManagement;
