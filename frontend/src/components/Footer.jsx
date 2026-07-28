import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Mail, Github, Twitter, Linkedin, Heart } from 'lucide-react';

export default function Footer() {
    const currentYear = new Date().getFullYear();

    const footerLinks = {
        Product: [
            { label: 'Study Notes', href: '/notes' },
            { label: 'Upload Notes', href: '/upload' },
            { label: 'Premium', href: '/premium' },
            { label: 'OCR Scanner', href: '/ocr' },
            { label: 'Community Chat', href: '/chat' },
        ],
        Company: [
            { label: 'About Us', href: '/about' },
            { label: 'Contact', href: '/contact-us' },
            { label: 'Careers', href: '/careers' },
            { label: 'Blog', href: '/blog' },
        ],
        Legal: [
            { label: 'Privacy Policy', href: '/privacy-policy' },
            { label: 'Terms & Conditions', href: '/terms-and-conditions' },
            { label: 'Cancellation & Refund', href: '/cancellation-and-refund' },
            { label: 'Shipping & Delivery', href: '/shipping-and-delivery' },
        ],
        Support: [
            { label: 'Help Center', href: '/help' },
            { label: 'FAQs', href: '/faqs' },
            { label: 'Report Issue', href: '/report' },
            { label: 'Feedback', href: '/feedback' },
        ],
    };

    const socialLinks = [
        { icon: Twitter, href: 'https://twitter.com/notflix', label: 'Twitter' },
        { icon: Github, href: 'https://github.com/notflix', label: 'GitHub' },
        { icon: Linkedin, href: 'https://linkedin.com/company/notflix', label: 'LinkedIn' },
        { icon: Mail, href: 'mailto:support@notflix.com', label: 'Email' },
    ];

    return (
        <footer className="neo-footer border-t-2 border-black bg-[var(--blue-20)]">
            <div className="container mx-auto px-4 py-12">
                <div className="grid grid-cols-2 md:grid-cols-6 gap-8 mb-12">
                    <div className="col-span-2">
                        <Link to="/" className="flex items-center space-x-2 mb-4">
                            <div className="flex h-10 w-10 items-center justify-center border-2 border-black bg-black text-[var(--blue-20)]">
                                <BookOpen className="h-5 w-5" />
                            </div>
                            <span className="font-display text-2xl font-black">NOTFLIX</span>
                        </Link>
                        <p className="text-gray-600 text-sm mb-4 max-w-xs">
                            Your ultimate study companion. Access high-quality notes, collaborate with peers, and ace your exams.
                        </p>
                        <div className="flex space-x-4">
                            {socialLinks.map((social) => (
                                <a
                                    key={social.label}
                                    href={social.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex h-9 w-9 items-center justify-center border-2 border-black bg-white text-black hover:bg-black hover:text-white transition-colors"
                                    aria-label={social.label}
                                >
                                    <social.icon className="h-4 w-4" />
                                </a>
                            ))}
                        </div>
                    </div>

                    {Object.entries(footerLinks).map(([category, links]) => (
                        <div key={category}>
                            <h4 className="font-bold text-sm uppercase tracking-wider mb-4 text-gray-800">{category}</h4>
                            <ul className="space-y-2">
                                {links.map((link) => (
                                    <li key={link.label}>
                                        <Link
                                            to={link.href}
                                            className="text-sm text-gray-600 hover:text-black transition-colors"
                                        >
                                            {link.label}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                <div className="border-t-2 border-black pt-8">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <p className="text-sm text-gray-600">
                            © {currentYear} Notflix. All rights reserved.
                        </p>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Heart className="h-4 w-4 text-red-500" aria-hidden="true" />
                            <span>Made with passion for students</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                            <Link to="/privacy-policy" className="hover:text-black transition-colors">Privacy</Link>
                            <span>·</span>
                            <Link to="/terms-and-conditions" className="hover:text-black transition-colors">Terms</Link>
                            <span>·</span>
                            <Link to="/contact-us" className="hover:text-black transition-colors">Contact</Link>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}