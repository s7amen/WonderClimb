import React, { useState, useEffect } from 'react';
import Card from '../../components/UI/Card';
import Button from '../../components/UI/Button';
import BaseModal from '../../components/UI/BaseModal';
import { cronAPI } from '../../services/api';
import { useToast } from '../../components/UI/Toast';

const CronJobs = () => {
    const [jobs, setJobs] = useState([]);
    const [selectedJob, setSelectedJob] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    const { showToast } = useToast();
    
    useEffect(() => {
        fetchJobs();
    }, []);
    
    const fetchJobs = async () => {
        try {
            setLoading(true);
            const response = await cronAPI.listJobs();
            setJobs(response.data.jobs || []);
        } catch (error) {
            console.error('Error fetching jobs:', error);
            showToast('Грешка при зареждане на cron jobs', 'error');
        } finally {
            setLoading(false);
        }
    };
    
    const handleTriggerJob = async (jobName) => {
        try {
            setLoading(true);
            await cronAPI.triggerJob(jobName);
            showToast(`Job "${jobName}" стартиран успешно`, 'success');
            fetchJobs(); // Refresh
        } catch (error) {
            console.error('Error triggering job:', error);
            showToast(`Грешка: ${error.response?.data?.error || error.message}`, 'error');
        } finally {
            setLoading(false);
        }
    };
    
    const viewHistory = async (jobName) => {
        try {
            setLoading(true);
            const response = await cronAPI.getHistory(jobName);
            setHistory(response.data.executions || []);
            setSelectedJob(jobName);
        } catch (error) {
            console.error('Error fetching history:', error);
            showToast('Грешка при зареждане на история', 'error');
        } finally {
            setLoading(false);
        }
    };
    
    const getStatusColor = (status) => {
        switch (status) {
            case 'success':
                return 'text-green-600 bg-green-50 border-green-200';
            case 'failed':
                return 'text-red-600 bg-red-50 border-red-200';
            case 'running':
                return 'text-yellow-600 bg-yellow-50 border-yellow-200';
            default:
                return 'text-gray-600 bg-gray-50 border-gray-200';
        }
    };
    
    const getStatusLabel = (status) => {
        switch (status) {
            case 'success':
                return 'Успешно';
            case 'failed':
                return 'Грешка';
            case 'running':
                return 'Изпълнява се';
            default:
                return status;
        }
    };
    
    return (
        <div className="space-y-6 pb-12">
            <div>
                <h1 className="text-2xl font-bold text-neutral-950">Cron Jobs</h1>
                <p className="text-sm text-gray-600 mt-1">Управление на автоматични задачи</p>
            </div>
            
            {loading && jobs.length === 0 ? (
                <div className="text-center py-8">
                    <p className="text-gray-500">Зареждане...</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {jobs.map(job => (
                        <Card key={job.name} className="p-6">
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                    <h3 className="font-medium text-lg text-neutral-950 mb-1">
                                        {job.displayName}
                                    </h3>
                                    <p className="text-sm text-gray-600 mb-2">
                                        {job.description}
                                    </p>
                                    <p className="text-xs text-gray-500 mb-3">
                                        📅 {job.scheduleReadable}
                                    </p>
                                    
                                    {/* Last Execution */}
                                    {job.lastExecution && (
                                        <div className={`mt-2 text-sm px-3 py-2 rounded border ${getStatusColor(job.lastExecution.status)}`}>
                                            <div className="font-medium mb-1">
                                                Последно изпълнение: {getStatusLabel(job.lastExecution.status)}
                                            </div>
                                            <div className="text-xs opacity-75">
                                                {new Date(job.lastExecution.startedAt).toLocaleString('bg-BG')}
                                                {job.lastExecution.duration && ` • ${job.lastExecution.duration}ms`}
                                            </div>
                                        </div>
                                    )}
                                    
                                    {!job.lastExecution && (
                                        <div className="text-sm text-gray-400 mt-2">
                                            Все още няма изпълнения
                                        </div>
                                    )}
                                </div>
                                
                                <div className="flex gap-2 ml-4">
                                    <Button 
                                        onClick={() => handleTriggerJob(job.name)}
                                        variant="primary"
                                        disabled={loading}
                                        className="whitespace-nowrap"
                                    >
                                        ▶️ Стартирай сега
                                    </Button>
                                    <Button 
                                        onClick={() => viewHistory(job.name)}
                                        variant="outline"
                                        disabled={loading}
                                        className="whitespace-nowrap"
                                    >
                                        📊 История
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
            
            {/* History Modal */}
            {selectedJob && (
                <BaseModal 
                    isOpen={true} 
                    onClose={() => {
                        setSelectedJob(null);
                        setHistory([]);
                    }}
                    title={`История: ${jobs.find(j => j.name === selectedJob)?.displayName || selectedJob}`}
                    size="lg"
                >
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                        {history.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                Няма история на изпълнения
                            </div>
                        ) : (
                            history.map(exec => (
                                <div 
                                    key={exec._id}
                                    className={`p-4 rounded-lg border ${getStatusColor(exec.status)}`}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="font-medium">
                                            {getStatusLabel(exec.status)}
                                        </span>
                                        <span className="text-sm opacity-75">
                                            {new Date(exec.startedAt).toLocaleString('bg-BG')}
                                        </span>
                                    </div>
                                    
                                    {exec.duration && (
                                        <div className="text-sm mb-1">
                                            ⏱️ Време: {exec.duration}ms
                                        </div>
                                    )}
                                    
                                    {exec.triggeredBy === 'manual' && exec.triggeredByUserId && (
                                        <div className="text-sm mb-1">
                                            👤 Стартиран от: {exec.triggeredByUserId.firstName} {exec.triggeredByUserId.lastName}
                                        </div>
                                    )}
                                    
                                    {exec.triggeredBy === 'cron' && (
                                        <div className="text-sm mb-1">
                                            ⏰ Автоматично изпълнение
                                        </div>
                                    )}
                                    
                                    {exec.error && (
                                        <div className="text-sm text-red-700 mt-2 p-2 bg-red-100 rounded">
                                            <strong>Грешка:</strong> {exec.error}
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </BaseModal>
            )}
        </div>
    );
};

export default CronJobs;

