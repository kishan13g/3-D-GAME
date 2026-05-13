from django.contrib.auth.models import User
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken
from .models import UserProfile, Wallet, WalletTransaction


class RegisterSerializer(serializers.ModelSerializer):
    password  = serializers.CharField(write_only=True, min_length=6)
    password2 = serializers.CharField(write_only=True)
    phone     = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model  = User
        fields = ['username', 'email', 'password', 'password2', 'phone']

    def validate(self, data):
        if data['password'] != data['password2']:
            raise serializers.ValidationError("Passwords do not match.")
        return data

    def create(self, validated_data):
        phone = validated_data.pop('phone', '')
        validated_data.pop('password2')
        user = User.objects.create_user(**validated_data)
        user.profile.phone = phone
        user.profile.save()
        return user


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model  = UserProfile
        fields = ['role', 'phone', 'is_active', 'created_at']


class WalletSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Wallet
        fields = ['balance', 'updated_at']


class UserSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(read_only=True)
    wallet  = WalletSerializer(read_only=True)
    tokens  = serializers.SerializerMethodField()

    class Meta:
        model  = User
        fields = ['id', 'username', 'email', 'profile', 'wallet', 'tokens']

    def get_tokens(self, user):
        refresh = RefreshToken.for_user(user)
        return {
            'refresh': str(refresh),
            'access':  str(refresh.access_token),
        }


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)


class WalletTransactionSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model  = WalletTransaction
        fields = ['id', 'username', 'txn_type', 'amount', 'status', 'note', 'created_at']


class AdminUserListSerializer(serializers.ModelSerializer):
    role    = serializers.CharField(source='profile.role', read_only=True)
    balance = serializers.DecimalField(source='wallet.balance', max_digits=12,
                                       decimal_places=2, read_only=True)
    phone   = serializers.CharField(source='profile.phone', read_only=True)

    class Meta:
        model  = User
        fields = ['id', 'username', 'email', 'phone', 'role', 'balance',
                  'is_active', 'date_joined']
