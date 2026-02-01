
import React, { useEffect, useState } from 'react';
import { getUserDonations, addDonation, deleteDonationRecord } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { DonationRecord, DonationStatus } from '../types';
import { Card, Button, Input, Badge, ConfirmModal } from '../components/UI';
import { Plus, History as HistoryIcon, Clock, Check, Calendar, Trash2 } from 'lucide-react';
import clsx from 'clsx';

export const MyDonations = () => {
  const { user } = useAuth();
  const [donations, setDonations] = useState<DonationRecord[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  
  // Confirmation Modal State
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchHistory = async () => {
    if (user) {
      setFetchLoading(true);
      try {
        const data = await getUserDonations(user.id);
        setDonations(data);
      } catch (err) {
        console.error("Failed to fetch donations", err);
      } finally {
        setFetchLoading(false);
      }
    }
  };

  useEffect(() => { fetchHistory(); }, [user]);

  const handleRequest = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    
    const formData = new FormData(e.currentTarget);
    try {
      await addDonation({
        userId: user.id,
        userName: user.name,
        userBloodGroup: user.bloodGroup,
        donationDate: new Date().toISOString(),
        location: formData.get('location') as string,
        units: 450, // Standard unit
        notes: formData.get('notes') as string
      }, user);
      
      setShowForm(false);
      await fetchHistory();
    } catch (err) {
      console.error("Failed to add donation", err);
      alert("Failed to submit request.");
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!user || !deleteId) return;
    setIsDeleting(true);
    try {
      await deleteDonationRecord(deleteId, user);
      await fetchHistory();
      setDeleteId(null);
    } catch (err) {
      console.error("Delete error", err);
      alert("Failed to delete record.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-red-50 rounded-xl">
            <HistoryIcon className="text-red-600" size={24} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">My Donation History</h1>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="w-4 h-4 mr-2" />
          Request Donation
        </Button>
      </div>

      {showForm && (
        <Card className="p-6 bg-white border-red-100 shadow-lg border-t-4 border-t-red-500 animate-in fade-in slide-in-from-top-4">
          <h3 className="font-bold text-slate-900 mb-4 text-lg">New Donation Request</h3>
          <form onSubmit={handleRequest} className="space-y-4">
            <Input label="Preferred Location" name="location" required placeholder="City Hospital or Blood Bank" />
            <Input label="Notes (Optional)" name="notes" placeholder="Any special instructions..." />
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button type="submit" isLoading={loading}>Submit Request</Button>
            </div>
          </form>
        </Card>
      )}

      {fetchLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
        </div>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b text-xs text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Location</th>
                  <th className="px-6 py-4">Units</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 hidden md:table-cell">Notes</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {donations.map(d => (
                  <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900 whitespace-nowrap">
                      {new Date(d.donationDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-4">{d.location}</td>
                    <td className="px-6 py-4 font-bold text-slate-700">{d.units} ml</td>
                    <td className="px-6 py-4">
                      <Badge color={d.status === 'COMPLETED' ? 'green' : d.status === 'PENDING' ? 'yellow' : 'red'}>
                        {d.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-slate-500 max-w-xs truncate hidden md:table-cell">{d.notes || '-'}</td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => setDeleteId(d.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        title="Delete History Record"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
                {donations.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center">
                        <HistoryIcon className="text-slate-300 mb-2" size={32} />
                        <p className="text-slate-500 font-medium">No donation records yet.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <ConfirmModal 
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={confirmDelete}
        title="Delete Record?"
        message="Are you sure you want to remove this record? This action will archive the data and cannot be undone."
        isLoading={isDeleting}
      />
    </div>
  );
};
