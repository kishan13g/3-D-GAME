from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from rest_framework import status, generics
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Wallet, WalletTransaction
from .serializers import (
    RegisterSerializer, UserSerializer, LoginSerializer,
    AdminUserListSerializer, WalletTransactionSerializer
)
from .permissions import IsAdminUser


@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    serializer = RegisterSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    serializer = LoginSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    user = authenticate(
        username=serializer.validated_data['username'],
        password=serializer.validated_data['password']
    )
    if not user:
        return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)
    if not user.profile.is_active:
        return Response({'error': 'Account suspended'}, status=status.HTTP_403_FORBIDDEN)
    return Response(UserSerializer(user).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me(request):
    return Response(UserSerializer(request.user).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout(request):
    try:
        RefreshToken(request.data.get('refresh')).blacklist()
    except Exception:
        pass
    return Response({'message': 'Logged out'})


# ─── Admin Views ────────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_user_list(request):
    users = User.objects.select_related('profile', 'wallet').all().order_by('-date_joined')
    serializer = AdminUserListSerializer(users, many=True)
    return Response(serializer.data)


@api_view(['PATCH'])
@permission_classes([IsAdminUser])
def admin_toggle_user(request, user_id):
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=404)
    user.profile.is_active = not user.profile.is_active
    user.profile.save()
    return Response({'is_active': user.profile.is_active})


@api_view(['POST'])
@permission_classes([IsAdminUser])
def admin_adjust_wallet(request, user_id):
    """Admin credit/debit user wallet directly."""
    try:
        wallet = Wallet.objects.get(user_id=user_id)
    except Wallet.DoesNotExist:
        return Response({'error': 'Wallet not found'}, status=404)

    amount  = request.data.get('amount', 0)
    action  = request.data.get('action', 'credit')  # 'credit' or 'debit'
    note    = request.data.get('note', 'Admin adjustment')

    try:
        amount = float(amount)
        if amount <= 0:
            raise ValueError()
    except (ValueError, TypeError):
        return Response({'error': 'Invalid amount'}, status=400)

    if action == 'credit':
        wallet.credit(amount)
        txn_type = 'deposit'
    else:
        wallet.debit(amount)
        txn_type = 'withdrawal'

    WalletTransaction.objects.create(
        user=wallet.user, txn_type=txn_type, amount=amount, note=note
    )
    return Response({'balance': wallet.balance, 'action': action, 'amount': amount})


@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_transactions(request):
    txns = WalletTransaction.objects.select_related('user').all()
    serializer = WalletTransactionSerializer(txns, many=True)
    return Response(serializer.data)
