import React from "react";
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { Crown, Star, Check, Download, Users, BookOpen, Zap, Shield, Headphones } from "lucide-react"
import { trackUserAction } from "../utils/analytics"
import { useAuth } from "@/context/AuthContext"
import { useNavigate } from "react-router-dom"
import { toast } from "react-hot-toast"

const plans = [
  {
    name: "Free",
    description: "Perfect for getting started",
    features: [
      "Access to free notes",
      "Basic search functionality",
      "Community chat access",
      "Download up to 10 notes/month",
      "Standard support",
    ],
    buttonText: "Current Plan",
    buttonVariant: "outline",
    popular: false,
  },
  {
    name: "Premium",
    description: "Unlock your full potential",
    features: [
      "Access to all premium notes",
      "Advanced search & filters",
      "Priority chat support",
      "Unlimited downloads",
      "Offline access",
      "Early access to new content",
      "Ad-free experience",
      "Premium community access",
    ],
    buttonText: "Upgrade Now",
    buttonVariant: "default",
    popular: true,
  },
  {
    name: "Pro",
    description: "For serious learners",
    features: [
      "Everything in Premium",
      "One-on-one tutoring sessions",
      "Custom note requests",
      "API access for developers",
      "White-label solutions",
      "Priority feature requests",
      "Dedicated account manager",
    ],
    buttonText: "Coming Soon",
    buttonVariant: "outline",
    popular: false,
  },
]

const premiumNotes = [
  {
    id: 1,
    title: "Advanced Java Design Patterns",
    author: "Dr. Sarah Mitchell",
    university: "MIT",
    rating: 4.9,
    downloads: 2500,
    preview: "Comprehensive guide to Singleton, Factory, Observer, and Strategy patterns with real-world applications...",
  },
  {
    id: 2,
    title: "C++ Performance Optimization",
    author: "Prof. Alex Chen",
    university: "Stanford",
    rating: 4.8,
    downloads: 1800,
    preview: "Deep dive into memory management, compiler optimizations, and performance profiling techniques...",
  },
  {
    id: 3,
    title: "Full-Stack Web Development Masterclass",
    author: "Emily Rodriguez",
    university: "Berkeley",
    rating: 4.9,
    downloads: 3200,
    preview: "Complete guide covering React, Node.js, databases, deployment, and modern development practices...",
  },
  {
    id: 4,
    title: "Linux Quickstart Guide",
    author: "Technical Documentation Team",
    university: "Open Source Community",
    rating: 4.7,
    downloads: 2100,
    preview: "Comprehensive Linux command-line guide covering essential commands, scripting, and system administration fundamentals...",
  },
  {
    id: 5,
    title: "AWS Cloud Architecture",
    author: "AWS Training Team",
    university: "Amazon Web Services",
    rating: 4.8,
    downloads: 1800,
    preview: "In-depth exploration of AWS services, architecture patterns, and best practices for cloud-native application deployment...",
  },
  {
    id: 6,
    title: "Prometheus Monitoring",
    author: "Monitoring Experts",
    university: "Open Source Projects",
    rating: 4.6,
    downloads: 1500,
    preview: "Complete guide to Prometheus monitoring, metrics collection, visualization, and alert management for modern infrastructure...",
  },
]

const benefits = [
  {
    icon: BookOpen,
    title: "Exclusive Content",
    description: "Access notes from top universities and industry experts",
  },
  {
    icon: Zap,
    title: "Advanced Features",
    description: "Enhanced search, offline access, and priority support",
  },
  {
    icon: Users,
    title: "Premium Community",
    description: "Connect with serious learners and get expert guidance",
  },
  {
    icon: Shield,
    title: "Quality Guarantee",
    description: "All premium content is verified and regularly updated",
  },
]

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function PremiumPage() {
  const { user, setUser, api } = useAuth();
  const navigate = useNavigate();

  const handleUpgradeClick = async (plan) => {
    if (!user) {
      toast.error('You are required to login to use this feature');
      navigate('/login');
      return;
    }

    if (user.isPremium) {
      toast.success('You are already a premium user!');
      return;
    }

    if (plan.name === 'Premium') {
      // Razorpay logic here
      const res = await loadRazorpayScript();
      if (!res) {
        toast.error("Failed to load Razorpay. Please try again.");
        return;
      }
      let order;
      try {
        const response = await api.post('/api/payment/orders');
        order = response.data;
      } catch (error) {
        toast.error(error.response?.data?.error || "Unable to start payment. Please try again later.");
        return;
      }
      const options = {
        key: order.key,
        order_id: order.orderId,
        amount: order.amount,
        currency: order.currency,
        name: "Notflix Premium Upgrade",
        description: "Lifetime Premium Access",
        image: "/faviconNotflix.png",
        handler: async function (response) {
          try {
            const verification = await api.post('/api/payment/verify', response);
            if (verification.data.user) {
              const updatedUser = verification.data.user;
              setUser(updatedUser);
              localStorage.setItem('user', JSON.stringify(updatedUser));
              toast.success("You are now a premium user!");
              navigate('/');
            } else {
              toast.error("Upgrade failed. Please contact support.");
            }
          } catch (error) {
            toast.error(error.response?.data?.error || "Upgrade failed. Please try again.");
          }
        },
        prefill: {
          name: user?.name || "",
          email: user?.email || "",
        },
        theme: {
          color: "#3399cc",
        },
        modal: {
          ondismiss: function () {
            toast("Payment cancelled.");
          },
        },
      };
      const rzp = new window.Razorpay(options);
      rzp.open();
    } else if (plan.name === 'Pro') {
      toast.info('Pro plan coming soon!');
    }
  };

  return (
    <div className="neo-premium container mx-auto px-4 py-12 space-y-16">
      {/* Hero Section */}
      <section className="text-center space-y-8 py-12 animate-fade-in-down">
        <div className="space-y-4">
          <Badge className="bg-[#b7c6c2] text-black px-4 py-2 animate-bounce-subtle border-2 border-black">
            <Crown className="w-4 h-4 mr-2" />
            Premium Access
          </Badge>
          <h1 className="font-display text-5xl md:text-7xl tracking-tight animate-fade-in-up">
            UNLOCK <span className="text-[#171e19]">PREMIUM</span> STUDY POWER.
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed animate-fade-in-up animation-delay-200">
            Get access to exclusive notes from top universities, expert-curated content, and advanced learning tools to
            accelerate your academic success.
          </p>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {benefits.map((benefit, index) => {
          const Icon = benefit.icon
          return (
            <Card 
              key={index} 
              className="text-center hover:shadow-lg transition-all duration-300 hover:scale-105 animate-fade-in-up border border-[#e2e8f0]"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <CardContent className="pt-6">
                <div className="w-12 h-12 bg-gradient-to-br from-[#bbd9e8] to-[#a8c8d8] rounded-lg flex items-center justify-center mx-auto mb-4 animate-pulse-subtle border border-[#e2e8f0]">
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold mb-2">{benefit.title}</h3>
                <p className="text-sm text-muted-foreground">{benefit.description}</p>
              </CardContent>
            </Card>
          )
        })}
      </section>

      {/* Pricing Plans */}
      <section id="pricing-plans" className="space-y-8 animate-fade-in-up animation-delay-300">
        <div className="text-center space-y-4">
          <h2 className="text-3xl font-bold">Choose Your Plan</h2>
          <p className="text-muted-foreground">Select the perfect plan for your learning journey</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <Card 
              key={index} 
              className={`relative hover:shadow-lg transition-all duration-300 hover:scale-105 animate-fade-in-up border border-[#e2e8f0] ${
                plan.popular ? "border-[#bbd9e8] shadow-lg" : ""
              }`}
              style={{ animationDelay: `${index * 150}ms` }}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 animate-bounce-subtle">
                  <Badge className="bg-gradient-to-r from-[#bbd9e8] to-[#a8c8d8] text-white px-4 py-1 border border-[#e2e8f0]">
                    Most Popular
                  </Badge>
                </div>
              )}

              <CardHeader className="text-center pb-4">
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <div className="space-y-2">
                  <CardDescription>{plan.description}</CardDescription>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                <ul className="space-y-3">
                  {plan.features.map((feature, featureIndex) => (
                    <li 
                      key={featureIndex} 
                      className="flex items-start space-x-3 animate-fade-in-right"
                      style={{ animationDelay: `${featureIndex * 50}ms` }}
                    >
                      <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  variant={plan.buttonVariant}
                  className={`w-full transition-all duration-300 border border-[#e2e8f0] ${
                    plan.popular && !(plan.name === 'Premium' && user?.isPremium)
                      ? "bg-[#bbd9e8] hover:bg-[#a8c8d8] text-white"
                      : ""
                  } ${
                    plan.name === 'Premium' && user?.isPremium
                      ? "bg-gray-300 text-gray-600 cursor-not-allowed font-semibold"
                      : ""
                  }`}
                  onClick={() => handleUpgradeClick(plan)}
                  disabled={plan.name === 'Premium' && user?.isPremium}
                >
                  {plan.name === 'Premium' && user?.isPremium ? "You are already Premium" : plan.buttonText}
                </Button>
                {plan.name === 'Premium' && !user?.isPremium && (
                  <div className="mt-2 text-xs text-blue-600 bg-blue-50 border border-blue-200 rounded px-2 py-1">
                    <strong>Test Mode:</strong> Use dummy card details (e.g., 4111 1111 1111 1111), any future expiry, any CVV, and any OTP to complete the payment. No real money will be deducted.
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Premium Notes Preview */}
      <section className="space-y-8 animate-fade-in-up animation-delay-400">
        <div className="text-center space-y-4">
          <h2 className="text-3xl font-bold">Featured Premium Content</h2>
          <p className="text-muted-foreground">Get a taste of our exclusive premium notes</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {premiumNotes.map((note, index) => (
            <Card 
              key={note.id} 
              className="hover:shadow-lg transition-all duration-300 hover:scale-105 group relative overflow-hidden animate-fade-in-up border border-[#e2e8f0]"
              style={{ animationDelay: `${index * 150}ms` }}
            >
              <div className="absolute top-4 right-4 z-10 animate-pulse-subtle">
                <Badge className="bg-[#b7c6c2] text-black border-2 border-black">
                  <Crown className="w-3 h-3 mr-1" />
                  Premium
                </Badge>
              </div>

              <CardHeader className="pb-3">
                <CardTitle className="text-lg leading-tight group-hover:text-[#bbd9e8] transition-colors pr-16">
                  {note.title}
                </CardTitle>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <div>by {note.author}</div>
                  <div>{note.university}</div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground line-clamp-3">{note.preview}</p>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center">
                      <Star className="w-4 h-4 mr-1 fill-[#b7c6c2] text-[#b7c6c2] animate-pulse-subtle" />
                      <span className="font-medium">{note.rating}</span>
                    </div>
                    <div className="flex items-center text-muted-foreground">
                      <Download className="w-4 h-4 mr-1" />
                      {note.downloads.toLocaleString()}
                    </div>
                  </div>
                </div>

                <Button 
                  className={`w-full bg-gradient-to-r from-[#bbd9e8] to-[#a8c8d8] hover:from-[#a8c8d8] hover:to-[#bbd9e8] text-white transition-all duration-300 hover:scale-105 border border-[#e2e8f0] ${user?.isPremium ? 'bg-green-500 text-white cursor-default' : ''}`}
                  onClick={() => {
                    if (!user?.isPremium) {
                      trackUserAction.viewPremiumContent('note');
                      document.getElementById('pricing-plans')?.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                  disabled={user?.isPremium}
                >
                  {user?.isPremium ? '✅ Included in Premium' : 'Get Premium Access'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      {!user?.isPremium && (
      <section className="text-center space-y-8 py-12 bg-gradient-to-r from-[#bbd9e8]/10 via-[#bbd9e8]/5 to-transparent rounded-2xl animate-fade-in-up animation-delay-500 border border-[#e2e8f0]">
        <div className="space-y-4">
          <h2 className="text-3xl font-bold">Ready to Go Premium?</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Join thousands of students who have accelerated their learning with premium content
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button 
            size="lg" 
            className="bg-[#bbd9e8] hover:bg-[#a8c8d8] text-white transition-all duration-300 hover:scale-105 animate-pulse-subtle border border-[#e2e8f0]"
            onClick={() => {
              trackUserAction.upgradeToPremium('premium');
              document.getElementById('pricing-plans')?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            <Crown className="w-5 h-5 mr-2" />
            Start Premium Trial
          </Button>
          <Button 
            size="lg" 
            variant="outline"
            className="transition-all duration-300 hover:scale-105 border border-[#e2e8f0]"
          >
            <Headphones className="w-5 h-5 mr-2" />
            Contact Support
          </Button>
        </div>
      </section>
      )}
    </div>
  )
} 
