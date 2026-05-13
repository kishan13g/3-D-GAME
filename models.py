from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver


class UserProfile(models.Model):
    ROLE_CHOICES = [('user', 'User'), ('admin', 'Admin')]

    user       = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    role       = models.CharField(max_length=10, choices=ROLE_CHOICES, default='user')
    phone      = models.CharField(max_length=15, blank=True)
    is_active  = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} ({self.role})"

    @property
    def is_admin(self):
        return self.role == 'admin'


class Wallet(models.Model):
    user       = models.OneToOneField(User, on_delete=models.CASCADE, related_name='wallet')
    balance    = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username} - ₹{self.balance}"

    def credit(self, amount):
        self.balance += amount
        self.save()

    def debit(self, amount):
        if self.balance < amount:
            raise ValueError("Insufficient balance")
        self.balance -= amount
        self.save()


class WalletTransaction(models.Model):
    TXN_TYPES = [
        ('deposit',    'Deposit'),
        ('withdrawal', 'Withdrawal'),
        ('bet_placed', 'Bet Placed'),
        ('winning',    'Winning'),
        ('refund',     'Refund'),
    ]
    STATUS_CHOICES = [
        ('pending',  'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]

    user       = models.ForeignKey(User, on_delete=models.CASCADE, related_name='transactions')
    txn_type   = models.CharField(max_length=15, choices=TXN_TYPES)
    amount     = models.DecimalField(max_digits=12, decimal_places=2)
    status     = models.CharField(max_length=10, choices=STATUS_CHOICES, default='approved')
    note       = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} | {self.txn_type} | ₹{self.amount}"


@receiver(post_save, sender=User)
def create_user_profile_and_wallet(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.create(user=instance)
        Wallet.objects.create(user=instance)
