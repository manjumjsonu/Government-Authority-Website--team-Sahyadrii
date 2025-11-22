import { useState } from 'react';
import { ChevronDown, ChevronUp, Calendar, ExternalLink, CheckCircle, Info } from 'lucide-react';

export function SchemeCard({ scheme }: { scheme: any }) {
    const [expanded, setExpanded] = useState(false);

    const getStatusColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'active':
                return 'from-green-500 to-emerald-600';
            case 'upcoming':
                return 'from-amber-400 to-orange-500';
            case 'closed':
                return 'from-red-500 to-rose-600';
            default:
                return 'from-gray-500 to-slate-600';
        }
    };

    return (
        <div
            className={`group relative bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 w-full min-w-0 h-full flex flex-col ${expanded ? 'ring-2 ring-green-100' : ''}`}
        >
            {/* Gradient Accent Line */}
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-green-400 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            <div
                className="p-5 cursor-pointer flex-shrink-0"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 space-y-3">
                        {/* Badges */}
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="px-3 py-1 text-xs font-semibold text-white bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full shadow-sm">
                                {scheme.category || 'General'}
                            </span>
                            {scheme.status && (
                                <span className={`px-3 py-1 text-xs font-semibold text-white bg-gradient-to-r ${getStatusColor(scheme.status)} rounded-full shadow-sm`}>
                                    {scheme.status}
                                </span>
                            )}
                        </div>

                        {/* Title & Description */}
                        <div>
                            <h4 className="text-xl font-bold text-gray-900 group-hover:text-green-700 transition-colors duration-200">
                                {scheme.title}
                            </h4>
                            <p className="mt-1 text-gray-600 text-sm leading-relaxed line-clamp-2 group-hover:line-clamp-none transition-all duration-300">
                                {scheme.shortDescription || scheme.description}
                            </p>
                        </div>
                    </div>

                    {/* Expand Toggle */}
                    <button
                        className={`p-2 rounded-full bg-gray-50 text-gray-400 group-hover:bg-green-50 group-hover:text-green-600 transition-all duration-200 ${expanded ? 'rotate-180 bg-green-50 text-green-600' : ''}`}
                    >
                        <ChevronDown className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Expanded Content */}
            <div
                className={`grid transition-all duration-300 ease-in-out flex-1 ${expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                    }`}
            >
                <div className="overflow-hidden">
                    <div className="px-5 pb-6 pt-2 space-y-6 border-t border-gray-100 bg-gradient-to-b from-white to-gray-50/50">

                        {/* Detailed Description */}
                        <div className="prose prose-sm max-w-none">
                            <div className="flex items-center gap-2 mb-2 text-gray-900 font-semibold">
                                <Info className="w-4 h-4 text-blue-500" />
                                Description
                            </div>
                            <p className="text-gray-600 leading-relaxed">
                                {scheme.detailedDescription || scheme.description}
                            </p>
                        </div>

                        {/* Key Details Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
                            <div>
                                <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Eligibility</h5>
                                <p className="text-gray-800 font-medium text-sm">{scheme.eligibility}</p>
                            </div>
                            <div>
                                <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Benefit</h5>
                                <p className="text-green-700 font-bold text-lg">{scheme.benefit}</p>
                            </div>
                        </div>

                        {/* Application Period */}
                        {(scheme.applicationStartDate || scheme.applicationEndDate) && (
                            <div className="flex items-center gap-3 p-3 bg-blue-50/50 text-blue-900 rounded-lg border border-blue-100">
                                <Calendar className="w-5 h-5 text-blue-500" />
                                <span className="text-sm font-medium">
                                    Application Period: {' '}
                                    <span className="font-bold">
                                        {scheme.applicationStartDate ? new Date(scheme.applicationStartDate).toLocaleDateString() : 'N/A'}
                                    </span>
                                    {' — '}
                                    <span className="font-bold">
                                        {scheme.applicationEndDate ? new Date(scheme.applicationEndDate).toLocaleDateString() : 'N/A'}
                                    </span>
                                </span>
                            </div>
                        )}

                        {/* Documents */}
                        <div>
                            <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Documents Required</h5>
                            <div className="flex flex-wrap gap-2">
                                {Array.isArray(scheme.documentsRequired) && scheme.documentsRequired.length > 0 ? (
                                    scheme.documentsRequired.map((doc: string, idx: number) => (
                                        <span
                                            key={idx}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-200 shadow-sm hover:border-green-200 hover:shadow-md transition-all duration-200"
                                        >
                                            <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                                            {doc}
                                        </span>
                                    ))
                                ) : (
                                    <span className="text-gray-500 italic text-sm">No specific documents listed</span>
                                )}
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-gray-200">
                            <div className="text-sm text-gray-500 font-medium">
                                <span className="text-gray-900">Contact:</span> {scheme.contactInfo}
                            </div>

                            {scheme.link && (
                                <a
                                    href={scheme.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="group/btn flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white text-sm font-bold rounded-full shadow-lg hover:shadow-green-500/30 hover:-translate-y-0.5 transition-all duration-200"
                                >
                                    Apply Now
                                    <ExternalLink className="w-4 h-4 group-hover/btn:translate-x-0.5 transition-transform" />
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
